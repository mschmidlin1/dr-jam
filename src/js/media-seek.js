(function (global) {
  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  function urlsMatch(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    try {
      return new URL(a, document.baseURI).href === new URL(b, document.baseURI).href;
    } catch {
      return false;
    }
  }

  function isFullySeekable(media) {
    const src = media.currentSrc || media.src || "";
    if (src.startsWith("blob:") && media._seekBlobUrl && src === media._seekBlobUrl) {
      return true;
    }
    if (!Number.isFinite(media.duration) || media.duration <= 0) return false;
    if (media.seekable.length === 0) return false;
    const end = media.seekable.end(media.seekable.length - 1);
    return end >= media.duration - 0.5;
  }

  function withEndedSuppressed(media, fn) {
    media._suppressEnded = (media._suppressEnded || 0) + 1;
    try {
      return fn();
    } finally {
      let cleared = false;
      const clear = () => {
        if (cleared) return;
        cleared = true;
        media._suppressEnded = Math.max(0, (media._suppressEnded || 1) - 1);
      };
      // Clear after the new resource has started (or failed), not synchronously —
      // browsers often fire `ended` for the aborted resource asynchronously.
      media.addEventListener("playing", clear, { once: true });
      media.addEventListener("error", clear, { once: true });
      setTimeout(clear, 1000);
    }
  }

  function invalidateSeekable(media) {
    media._seekRequestId = (media._seekRequestId || 0) + 1;
    if (media._seekAbortController) {
      media._seekAbortController.abort();
      delete media._seekAbortController;
    }
    delete media._seekBlobPromise;
    const oldUrl = media._seekBlobUrl;
    delete media._seekBlobUrl;
    return oldUrl || null;
  }

  function applySeekBlob(media, blob, requestId, fetchedSrc) {
    if (media._seekRequestId !== requestId) return false;

    const current = media.currentSrc || media.src || "";
    // Only replace if we are still on the network URL we fetched (or empty/broken).
    if (current && !urlsMatch(current, fetchedSrc) && !current.startsWith("blob:")) {
      return false;
    }
    // If already on a different blob, a newer load won.
    if (current.startsWith("blob:") && media._seekBlobUrl && current === media._seekBlobUrl) {
      return false;
    }

    const wasPlaying = !media.paused;
    const time = media.currentTime;

    if (media._seekBlobUrl) {
      URL.revokeObjectURL(media._seekBlobUrl);
    }

    media._seekBlobUrl = URL.createObjectURL(blob);

    withEndedSuppressed(media, () => {
      media.src = media._seekBlobUrl;
    });

    const onReady = () => {
      if (media._seekRequestId !== requestId) return;
      if (Number.isFinite(time) && time > 0) {
        media.currentTime = time;
      }
      if (wasPlaying) {
        media.play().catch(() => {});
      }
    };

    if (media.readyState >= 1) {
      onReady();
    } else {
      media.addEventListener("loadedmetadata", onReady, { once: true });
    }

    return true;
  }

  function ensureSeekable(media) {
    if (isFullySeekable(media)) return Promise.resolve();
    if (media._seekBlobPromise) return media._seekBlobPromise;

    const src = media.currentSrc || media.src;
    if (!src || src.startsWith("blob:")) return Promise.resolve();

    const requestId = (media._seekRequestId = (media._seekRequestId || 0) + 1);
    const controller = new AbortController();
    media._seekAbortController = controller;
    const fetchedSrc = src;

    media._seekBlobPromise = fetch(src, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch media");
        return response.blob();
      })
      .then((blob) => {
        applySeekBlob(media, blob, requestId, fetchedSrc);
      })
      .catch((err) => {
        if (err && err.name === "AbortError") return;
        if (media._seekRequestId === requestId) {
          delete media._seekBlobPromise;
        }
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
  }

  global.DrJamMedia = {
    formatTime,
    isFullySeekable,
    invalidateSeekable,
    ensureSeekable,
    withEndedSuppressed,
    bindSeekInput,
  };
})(window);
