const MUSIC_BASE = "../resources/music/Albums";

function trackSrc(folder, file) {
  // encodeURIComponent so "&" in folder names becomes %26 (encodeURI leaves it bare).
  return `${MUSIC_BASE}/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`;
}

function buildTracks(albumId, folder, trackDefs) {
  return trackDefs.map((def, index) => {
    const num = String(index + 1).padStart(2, "0");
    const file = `${num} Track${num}.wav`;
    const track = {
      id: `${albumId}-${index}`,
      file,
      title: def.title,
      src: trackSrc(folder, file),
    };
    if (def.credit) track.credit = def.credit;
    if (def.soloists && def.soloists.length) track.soloists = def.soloists;
    return track;
  });
}

const TRIBUTE_FOLDER = "Dr Jam & His Friends - A Tribute to Bill Dengler";
const FAVORITES_FOLDER = "John Moreland - Some Favorite Songs";
const HOLD_COURT_FOLDER = "Dr Jam and Friends Hold Court";

const ALBUMS = [
  {
    id: "tribute",
    title: "I Remember You, A Tribute to Bill Dengler",
    band: "Dr. Jam and Friends",
    folder: TRIBUTE_FOLDER,
    tracks: buildTracks("tribute", TRIBUTE_FOLDER, [
      {
        title: 'Take the "A" Train',
        credit: "Billy Strayhorn, Arr. John Moreland",
      },
      {
        title: "What a Difference a Day Made",
        credit: "Stanley Adams & Maria Grever, Arr. John Moreland",
      },
      {
        title: "Lil' Darlin'",
        credit: "Neal Hefti, Orch. John Moreland",
      },
      {
        title: "I Remember You",
        credit:
          "Words by Johnny Mercer, Music by Victor Schertzinger, Arr. John Moreland",
      },
      {
        title: "Watch What Happens",
        credit:
          "Words by Norman Gimbel, Music by Michel Legrand, Arr. Mark Taylor, Orch. John Moreland",
      },
      {
        title: "Quiet Night of Quiet Stars",
        credit: "Words & Music by Antonio Carlos Jobim, Orch. John Moreland",
      },
      {
        title: "September in the Rain",
        credit:
          "Words by Al Dubin, Music by Harry Warren, Arr. John Moreland",
      },
      {
        title: "Who's Blues for Bill",
        credit: "Composed & Arr. John Moreland",
      },
      {
        title: "Frenesi",
        credit: "Words & Music by Alberto Dominguez, Orch. John Moreland",
      },
      {
        title: "I'm Gettin' Sentimental Over You",
        credit: "Words by Ned Washington, Music by George Bassman",
      },
      {
        title: "This Love of Mine",
        credit:
          "Words by Frank Sinatra, Music by Sol Parker & Henry Sanicola",
      },
      {
        title: "Sunny Side of the Street",
        credit:
          "Words by Dorothy Fields, Music by Jimmy McHugh, Orch. John Moreland",
      },
      {
        title: "The Way I Feel About You",
        credit: "Carl Severinsen & Tom Newsom, Orch. John Moreland",
      },
      {
        title: "A String of Pearls",
        credit: "Jerry Gray, Arr. Johnny Warrington, Orch. John Moreland",
      },
      {
        title: "Shufflin' for Bill",
        credit: "Jim Snidero, Arr. John Moreland",
      },
      {
        title: "Moonglow",
        credit:
          "Will Hudson, Eddie DeLange & Irving Mills, Arr. John Moreland",
      },
      {
        title: "Perfidia",
        credit: "Words & Music by Alberto Dominguez, Arr. John Moreland",
      },
      {
        title: "Things Ain't What They Used to Be",
        credit: "Mercer Ellington, Arr. John Moreland",
      },
      {
        title: "Sentimental Journey",
        credit: "Bud Green, Les Brown & Ben Homer, Arr. John Moreland",
      },
      {
        title: "Tenderly",
        credit:
          "Words by Jack Lawrence, Music by Walter Gross, Orch. John Moreland",
        soloists: [
          "Trombone solo by Bill Dengler with the Tommy Dorsey Band",
        ],
      },
    ]),
  },
  {
    id: "favorites",
    title: "Things Ain't What They Used To Be (Some Favorite Songs)",
    band: "Penfield Rotary Stage Band, Director Dick Stacey",
    folder: FAVORITES_FOLDER,
    tracks: buildTracks("favorites", FAVORITES_FOLDER, [
      {
        title: "I Remember Clifford",
        soloists: ["John Moreland (trumpet)"],
      },
      {
        title: "Things Ain't What They Used To Be",
        soloists: [
          "George Pierce (tenor)",
          "Vic Plati (alto)",
          "Don Jones (piano)",
          "Joe Pera (trumpet)",
        ],
      },
      { title: "This Love Of Mine" },
      {
        title: "I Can't Get Started - You Go To My Head",
        soloists: ["John Moreland (trumpet)", "Vic Plati (alto)"],
      },
      {
        title: "Tenderly",
        soloists: ["Bill Dengler (trombone)", "Vic Plati (alto)"],
      },
      {
        title: 'Take The "A" Train',
        soloists: [
          "Don Jones (piano)",
          "George Pierce (tenor)",
          "Joe Pera (trumpet)",
        ],
      },
      {
        title: "Someone To Watch Over Me",
        soloists: ["John Moreland (trumpet)", "George Pierce (tenor)"],
      },
      {
        title: "All Of Me",
        soloists: ["Penny Pallini (vocal)", "Vic Plati (alto)"],
      },
      {
        title: "Mean To Me",
        soloists: ["Penny Pallini (vocal)"],
      },
      {
        title: "You've Changed",
        soloists: ["John Moreland (flugelhorn)"],
      },
      {
        title: "What's New",
        soloists: ["Joe Pera (trumpet)"],
      },
      {
        title: "Speak Low",
        soloists: ["Joe Pera (flugelhorn)", "Vic Plati (alto)"],
      },
      {
        title: "When You Wish Upon A Star",
        soloists: ["Joe Pera (flugelhorn)"],
      },
      {
        title: "My Funny Valentine",
        soloists: ["Jim Neyhard (trumpet)"],
      },
    ]),
  },
  {
    id: "hold-court",
    title: "Dr. Jam and Friends Hold Court",
    band: "Dr. Jam and Friends",
    folder: HOLD_COURT_FOLDER,
    tracks: buildTracks("hold-court", HOLD_COURT_FOLDER, [
      {
        title: "C Jam Blues",
        credit: "Duke Ellington, Arr. John Moreland",
      },
      {
        title: "Stompin' At The Savoy",
        credit:
          "Music by Chick Webb, Benny Goodman, Andy Razaf & Edgar Sampson, Arr. John Moreland",
      },
      {
        title: "Dream",
        credit: "Words & Music by Johnny Mercer, Arr. John Moreland",
      },
      {
        title: "I'll Remember April",
        credit:
          "Words & Music by Don Raye, Gene dePaul & Pat Johnston, Arr. John Moreland",
      },
      {
        title: "You Are Too Beautiful",
        credit:
          "Words by Lorenz Hart, Music by Richard Rodgers, Arr. John Moreland",
      },
      {
        title: "Autumn Leaves",
        credit:
          "Words by Johnny Mercer, Music by Joseph Kosma, Arr. John Moreland",
      },
      {
        title: "Blue Tango",
        credit: "Leroy Anderson, Arr. John Moreland",
      },
      {
        title: "Dansero",
        credit: "A. Dominguez, Arr. John Moreland",
      },
      {
        title: "Day By Day",
        credit:
          "Words & Music by Sammy Cahn, Axel Stordahl & Paul Weston, Arr. John Moreland",
      },
      {
        title: "East Of The Sun",
        credit: "Words & Music by Brooks Bowman, Arr. John Moreland",
      },
      {
        title: "The Girl From Ipanema",
        credit:
          "Music by Antonio Carlos Jobim, Words by Vinicius DeMoraes & Norman Gimbel, Arr. John Moreland",
      },
      {
        title: "When Sunny Gets Blue",
        credit:
          "Music by Marvin Fisher, Lyrics by Jack Segal, Arr. John Moreland",
      },
      {
        title: "It's Only A Paper Moon",
        credit:
          "Words by Billy Rose & E.Y. Harburg, Music by Harold Arlen, Arr. John Moreland",
      },
      {
        title: "The Lady Is A Tramp",
        credit:
          "Words by Lorenz Hart, Music by Richard Rodgers, Arr. John Moreland",
      },
      {
        title: "Try A Little Tenderness",
        credit:
          "Words & Music by Harry Woods, Jimmy Campbell & Reg Connelly, Arr. John Moreland",
      },
      {
        title: "Lulu's Back In Town",
        credit:
          "Words by Al Dubin, Music by Harry Warren, Arr. John Moreland",
      },
      {
        title: "Blue Moon",
        credit: "Lorenz Hart & Richard Rodgers, Arr. John Moreland",
      },
      {
        title: "Basin Street Blues",
        credit: "Spencer Williams, Arr. Bill Howard",
      },
      {
        title: "Black Bottom",
        credit:
          "Words by B.G. DeSylva & Lew Brown, Music by Ray Henderson, Arr. Paul Severson",
      },
      {
        title: "Charleston",
        credit:
          "Words & Music by Cecil Mack & Jimmy Johnson, Arr. Paul Severson",
      },
      {
        title: "Randolph Street Strut",
        credit: "Eddie Pripps & Zep Meissner, Arr. Zep Meissner",
      },
    ]),
  },
];
