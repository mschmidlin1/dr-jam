const MUSIC_BASE = "../resources/music/The Penfield Rotary Stage Band";

const TRACK_FILES = [
  "01 I Remember Clifford.wav",
  "02 Things Ain_t What They Used To Be.wav",
  "03 This Love Of Mine.wav",
  "04 I Can_t Get Started - You Go To My Head.wav",
  "05 Tenderly.wav",
  "06 Take The _A_ Train.wav",
  "07 Someone To Watch Over Me.wav",
  "08 All Of Me.wav",
  "09 Mean To Me.wav",
  "10 You_ve Changed.wav",
  "11 What_s New.wav",
];

function formatTrackTitle(filename) {
  const name = filename.replace(/^\d+\s+/, "").replace(/\.wav$/i, "");
  return name
    .replace(/_A_/g, '"A"')
    .replace(/Ain_t/g, "Ain't")
    .replace(/Can_t/g, "Can't")
    .replace(/You_ve/g, "You've")
    .replace(/What_s/g, "What's")
    .replace(/_/g, "'");
}

function buildTracks(folder) {
  return TRACK_FILES.map((file, index) => ({
    id: `${folder}-${index}`,
    file,
    title: formatTrackTitle(file),
    src: `${MUSIC_BASE}/${folder}/${file}`,
  }));
}

const ALBUMS = [
  {
    id: "vol1",
    title: "Things Ain't What They Used To Be",
    band: "The Penfield Rotary Stage Band",
    folder: "Things Ain_t What They Used To Be",
    tracks: buildTracks("Things Ain_t What They Used To Be"),
  },
  {
    id: "vol2",
    title: "Things Ain't What They Used To Be — Vol. II",
    band: "The Penfield Rotary Stage Band",
    folder: "Things Ain_t What They Used To Be - Vol. II",
    tracks: buildTracks("Things Ain_t What They Used To Be - Vol. II"),
  },
  {
    id: "vol3",
    title: "Things Ain't What They Used To Be — Vol. III",
    band: "The Penfield Rotary Stage Band",
    folder: "Things Ain_t What They Used To Be - Vol. III",
    tracks: buildTracks("Things Ain_t What They Used To Be - Vol. III"),
  },
];
