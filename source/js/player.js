(function () {
  const container = document.getElementById("recordings-content");
  if (!container || typeof ALBUMS === "undefined") return;

  const audio = new Audio();
  let activeAlbumId = null;
  let activeTrackIndex = null;
  let playAllMode = false;

  function getAlbum(albumId) {
    return ALBUMS.find((album) => album.id === albumId);
  }

  function resetAllButtons() {
    container.querySelectorAll(".track-play-btn").forEach((btn) => {
      btn.textContent = "Play";
      btn.setAttribute("aria-label", `Play ${btn.dataset.trackTitle}`);
      btn.classList.remove("is-playing");
    });

    container.querySelectorAll(".album-play-all-btn").forEach((btn) => {
      btn.textContent = "Play All";
      btn.setAttribute("aria-label", `Play all tracks on ${btn.dataset.albumTitle}`);
      btn.classList.remove("is-playing");
    });
  }

  function setPlayingState(albumId, trackIndex) {
    resetAllButtons();

    const trackBtn = container.querySelector(
      `[data-album-id="${albumId}"][data-track-index="${trackIndex}"]`
    );
    if (trackBtn) {
      trackBtn.textContent = "Pause";
      trackBtn.setAttribute("aria-label", `Pause ${trackBtn.dataset.trackTitle}`);
      trackBtn.classList.add("is-playing");
    }

    const playAllBtn = container.querySelector(
      `[data-album-id="${albumId}"].album-play-all-btn`
    );
    if (playAllBtn) {
      playAllBtn.textContent = "Pause";
      playAllBtn.setAttribute("aria-label", `Pause ${playAllBtn.dataset.albumTitle}`);
      playAllBtn.classList.add("is-playing");
    }
  }

  function playTrack(albumId, trackIndex, fromPlayAll) {
    const album = getAlbum(albumId);
    if (!album) return;

    const track = album.tracks[trackIndex];
    if (!track) return;

    if (
      activeAlbumId === albumId &&
      activeTrackIndex === trackIndex &&
      !audio.paused
    ) {
      audio.pause();
      resetAllButtons();
      return;
    }

    activeAlbumId = albumId;
    activeTrackIndex = trackIndex;
    playAllMode = fromPlayAll;

    audio.src = track.src;
    audio.play().catch(() => {
      resetAllButtons();
    });
    setPlayingState(albumId, trackIndex);
  }

  function playAll(albumId) {
    const album = getAlbum(albumId);
    if (!album) return;

    if (activeAlbumId === albumId && !audio.paused) {
      audio.pause();
      resetAllButtons();
      return;
    }

    playTrack(albumId, 0, true);
  }

  audio.addEventListener("ended", () => {
    const album = getAlbum(activeAlbumId);
    if (!album || activeTrackIndex === null) return;

    const nextIndex = activeTrackIndex + 1;
    if (nextIndex < album.tracks.length) {
      playTrack(activeAlbumId, nextIndex, playAllMode);
    } else {
      activeAlbumId = null;
      activeTrackIndex = null;
      playAllMode = false;
      resetAllButtons();
    }
  });

  function renderAlbums() {
    container.innerHTML = ALBUMS.map(
      (album) => `
        <section class="album-section" aria-labelledby="album-${album.id}">
          <div class="album-header">
            <div>
              <h2 class="album-title" id="album-${album.id}">${album.title}</h2>
              <p class="album-band">${album.band}</p>
            </div>
            <button
              type="button"
              class="btn album-play-all-btn"
              data-album-id="${album.id}"
              data-album-title="${album.title}"
              aria-label="Play all tracks on ${album.title}"
            >
              Play All
            </button>
          </div>
          <ol class="track-list">
            ${album.tracks
              .map(
                (track, index) => `
              <li class="track-item">
                <span class="track-number">${String(index + 1).padStart(2, "0")}</span>
                <span class="track-title">${track.title}</span>
                <button
                  type="button"
                  class="btn track-play-btn"
                  data-album-id="${album.id}"
                  data-track-index="${index}"
                  data-track-title="${track.title}"
                  aria-label="Play ${track.title}"
                >
                  Play
                </button>
              </li>
            `
              )
              .join("")}
          </ol>
        </section>
      `
    ).join("");

    container.querySelectorAll(".track-play-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        playTrack(
          btn.dataset.albumId,
          Number(btn.dataset.trackIndex),
          false
        );
      });
    });

    container.querySelectorAll(".album-play-all-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        playAll(btn.dataset.albumId);
      });
    });
  }

  renderAlbums();
})();
