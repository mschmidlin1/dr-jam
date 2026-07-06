(function (global) {
  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  function isFullySeekable(media) {
    if ((media.currentSrc || media.src || "").startsWith("blob:")) return true;
    if (!Number.isFinite(media.duration) || media.duration <= 0) return false;
    if (media.seekable.length === 0) return false;
    const end = media.seekable.end(media.seekable.length - 1);
    return end >= media.duration - 0.5;
  }

  function ensureSeekable(media) {
    if (isFullySeekable(media)) return Promise.resolve();
    if (media._seekBlobPromise) return media._seekBlobPromise;

    const src = media.currentSrc || media.src;
    if (!src || src.startsWith("blob:")) return Promise.resolve();

    media._seekBlobPromise = fetch(src)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch media");
        return response.blob();
      })
      .then((blob) => {
        const wasPlaying = !media.paused;
        const time = media.currentTime;

        if (media._seekBlobUrl) {
          URL.revokeObjectURL(media._seekBlobUrl);
        }

        media._seekBlobUrl = URL.createObjectURL(blob);
        media.src = media._seekBlobUrl;

        return new Promise((resolve) => {
          const onReady = () => {
            if (Number.isFinite(time) && time > 0) {
              media.currentTime = time;
            }
            if (wasPlaying) {
              media.play().catch(() => {});
            }
            resolve();
          };

          if (media.readyState >= 1) {
            onReady();
          } else {
            media.addEventListener("loadedmetadata", onReady, { once: true });
          }
        });
      })
      .catch(() => {
        delete media._seekBlobPromise;
      });

    return media._seekBlobPromise;
  }

  function bindSeekInput(media, seekInput, currentEl, durationEl, state) {
    function updateDuration() {
      if (durationEl && Number.isFinite(media.duration)) {
        durationEl.textContent = formatTime(media.duration);
      }
    }

    function seekFromInput() {
      if (!Number.isFinite(media.duration) || media.duration <= 0) return;
      media.currentTime = (Number(seekInput.value) / 1000) * media.duration;
    }

    media.addEventListener("loadedmetadata", updateDuration);
    media.addEventListener("durationchange", updateDuration);

    media.addEventListener("timeupdate", () => {
      if (state.isSeeking || !Number.isFinite(media.duration)) return;
      seekInput.value = String(
        Math.round((media.currentTime / media.duration) * 1000)
      );
      if (currentEl) {
        currentEl.textContent = formatTime(media.currentTime);
      }
    });

    seekInput.addEventListener("pointerdown", () => {
      state.isSeeking = true;
      ensureSeekable(media);
    });

    seekInput.addEventListener("input", () => {
      state.isSeeking = true;
      const duration = media.duration || 0;
      const time = (Number(seekInput.value) / 1000) * duration;
      if (currentEl) {
        currentEl.textContent = formatTime(time);
      }
      ensureSeekable(media).then(seekFromInput);
    });

    seekInput.addEventListener("change", () => {
      ensureSeekable(media).then(() => {
        seekFromInput();
        state.isSeeking = false;
      });
    });

    media.addEventListener("loadedmetadata", () => {
      if (!isFullySeekable(media)) {
        ensureSeekable(media);
      }
    });
  }

  global.DrJamMedia = {
    formatTime,
    isFullySeekable,
    ensureSeekable,
    bindSeekInput,
  };
})(window);
