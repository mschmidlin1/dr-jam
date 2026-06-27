(function () {
  const container = document.getElementById("recordings-content");
  if (!container || typeof ALBUMS === "undefined") return;

  const audio = new Audio();
  let activeAlbumId = null;
  let activeTrackIndex = null;
  let playAllMode = false;
  let isSeeking = false;

  const playerBar = document.getElementById("audio-player");
  const playerTrackTitle = document.getElementById("player-track-title");
  const playerAlbumTitle = document.getElementById("player-album-title");
  const playerPlayPause = document.getElementById("player-play-pause");
  const playerPrev = document.getElementById("player-prev");
  const playerNext = document.getElementById("player-next");
  const playerSeek = document.getElementById("player-seek");
  const playerCurrentTime = document.getElementById("player-current-time");
  const playerDuration = document.getElementById("player-duration");

  function getAlbum(albumId) {
    return ALBUMS.find((album) => album.id === albumId);
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  function getActiveTrack() {
    const album = getAlbum(activeAlbumId);
    if (!album || activeTrackIndex === null) return null;
    return album.tracks[activeTrackIndex];
  }

  function updateTrackListHighlight() {
    container.querySelectorAll(".track-item").forEach((item) => {
      item.classList.remove("is-active");
    });

    if (activeAlbumId === null || activeTrackIndex === null) return;

    const activeItem = container.querySelector(
      `.track-item[data-album-id="${activeAlbumId}"][data-track-index="${activeTrackIndex}"]`
    );
    if (activeItem) {
      activeItem.classList.add("is-active");
    }
  }

  function updatePlayAllButtons() {
    container.querySelectorAll(".album-play-all-btn").forEach((btn) => {
      const isActiveAlbum =
        btn.dataset.albumId === activeAlbumId && activeAlbumId !== null;
      const isPlaying = isActiveAlbum && !audio.paused;
      btn.textContent = isPlaying ? "Pause All" : "Play All";
      btn.classList.toggle("is-playing", isPlaying);
    });
  }

  function updateTrackPlayButtons() {
    container.querySelectorAll(".track-play-btn").forEach((btn) => {
      const isActiveTrack =
        btn.dataset.albumId === activeAlbumId &&
        Number(btn.dataset.trackIndex) === activeTrackIndex &&
        activeAlbumId !== null;
      const isPlaying = isActiveTrack && !audio.paused;

      btn.textContent = isPlaying ? "Pause" : "Play";
      btn.classList.toggle("is-playing", isPlaying);
      btn.setAttribute(
        "aria-label",
        isPlaying ? `Pause ${btn.dataset.trackTitle}` : `Play ${btn.dataset.trackTitle}`
      );
    });
  }

  function updatePlayerBar() {
    const album = getAlbum(activeAlbumId);
    const track = getActiveTrack();

    if (!album || !track) {
      playerBar.hidden = true;
      return;
    }

    playerBar.hidden = false;
    playerTrackTitle.textContent = track.title;
    playerAlbumTitle.textContent = album.title;

    const isPlaying = !audio.paused;
    playerPlayPause.innerHTML = isPlaying ? "&#10074;&#10074;" : "&#9654;";
    playerPlayPause.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
    playerPlayPause.setAttribute("title", isPlaying ? "Pause" : "Play");

    playerPrev.disabled = activeTrackIndex === 0;
    playerNext.disabled = activeTrackIndex >= album.tracks.length - 1;

    if (!isSeeking && Number.isFinite(audio.duration)) {
      playerSeek.value = String(
        Math.round((audio.currentTime / audio.duration) * 1000)
      );
      playerCurrentTime.textContent = formatTime(audio.currentTime);
      playerDuration.textContent = formatTime(audio.duration);
    }

    updateTrackListHighlight();
    updatePlayAllButtons();
    updateTrackPlayButtons();
  }

  function loadAndPlay(albumId, trackIndex, fromPlayAll) {
    const album = getAlbum(albumId);
    if (!album) return;

    const track = album.tracks[trackIndex];
    if (!track) return;

    activeAlbumId = albumId;
    activeTrackIndex = trackIndex;
    playAllMode = fromPlayAll;

    audio.src = track.src;
    audio.play().catch(() => {
      updatePlayerBar();
    });
    updatePlayerBar();
  }

  function togglePlayPause() {
    if (activeAlbumId === null) return;

    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
    updatePlayerBar();
  }

  function playTrack(albumId, trackIndex, fromPlayAll) {
    const isSameTrack =
      activeAlbumId === albumId && activeTrackIndex === trackIndex;

    if (isSameTrack) {
      togglePlayPause();
      return;
    }

    loadAndPlay(albumId, trackIndex, fromPlayAll);
  }

  function playAll(albumId) {
    const album = getAlbum(albumId);
    if (!album) return;

    if (activeAlbumId === albumId) {
      togglePlayPause();
      return;
    }

    loadAndPlay(albumId, 0, true);
  }

  function playPrevious() {
    const album = getAlbum(activeAlbumId);
    if (!album || activeTrackIndex === null) return;

    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      updatePlayerBar();
      return;
    }

    if (activeTrackIndex > 0) {
      loadAndPlay(activeAlbumId, activeTrackIndex - 1, playAllMode);
    }
  }

  function playNext() {
    const album = getAlbum(activeAlbumId);
    if (!album || activeTrackIndex === null) return;

    if (activeTrackIndex < album.tracks.length - 1) {
      loadAndPlay(activeAlbumId, activeTrackIndex + 1, playAllMode);
    }
  }

  function stopPlayback() {
    audio.pause();
    activeAlbumId = null;
    activeTrackIndex = null;
    playAllMode = false;
    playerSeek.value = "0";
    playerCurrentTime.textContent = "0:00";
    playerDuration.textContent = "0:00";
    updatePlayerBar();
    updateTrackListHighlight();
    updatePlayAllButtons();
    updateTrackPlayButtons();
  }

  audio.addEventListener("ended", () => {
    const album = getAlbum(activeAlbumId);
    if (!album || activeTrackIndex === null) return;

    const nextIndex = activeTrackIndex + 1;
    if (nextIndex < album.tracks.length) {
      loadAndPlay(activeAlbumId, nextIndex, playAllMode);
    } else {
      stopPlayback();
    }
  });

  audio.addEventListener("timeupdate", () => {
    if (isSeeking || !Number.isFinite(audio.duration)) return;
    playerSeek.value = String(
      Math.round((audio.currentTime / audio.duration) * 1000)
    );
    playerCurrentTime.textContent = formatTime(audio.currentTime);
  });

  audio.addEventListener("loadedmetadata", () => {
    playerDuration.textContent = formatTime(audio.duration);
    updatePlayerBar();
  });

  audio.addEventListener("play", updatePlayerBar);
  audio.addEventListener("pause", updatePlayerBar);

  playerPlayPause.addEventListener("click", togglePlayPause);
  playerPrev.addEventListener("click", playPrevious);
  playerNext.addEventListener("click", playNext);

  playerSeek.addEventListener("input", () => {
    isSeeking = true;
    const duration = audio.duration || 0;
    const time = (Number(playerSeek.value) / 1000) * duration;
    playerCurrentTime.textContent = formatTime(time);
  });

  playerSeek.addEventListener("change", () => {
    const duration = audio.duration || 0;
    audio.currentTime = (Number(playerSeek.value) / 1000) * duration;
    isSeeking = false;
    updatePlayerBar();
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
              <li
                class="track-item"
                data-album-id="${album.id}"
                data-track-index="${index}"
              >
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
        playTrack(btn.dataset.albumId, Number(btn.dataset.trackIndex), false);
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
