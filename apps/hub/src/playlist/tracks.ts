export interface PlaylistTrack {
  id: number;
  title: string;
  theme: string;
  src: string;
}

export const PLAYLIST_TRACKS: PlaylistTrack[] = [
  {
    id: 1,
    title: "Fully On-Chain",
    theme: "Ethereum storage — no IPFS, permanent faces",
    src: "/playlist/01-fully-on-chain.mp3",
  },
  {
    id: 2,
    title: "Two Colors Only",
    theme: "#48494b on #e3e5e4 — forty by forty bitmap",
    src: "/playlist/02-two-colors-only.mp3",
  },
  {
    id: 3,
    title: "Eight Trait Bytes",
    theme: "bytes8 decoded into eight trait categories",
    src: "/playlist/03-eight-trait-bytes.mp3",
  },
  {
    id: 4,
    title: "Human, Cat, Alien, Agent",
    theme: "The four official Types",
    src: "/playlist/04-human-cat-alien-agent.mp3",
  },
  {
    id: 5,
    title: "NormiesCanvas",
    theme: "XOR transforms and on-chain customization",
    src: "/playlist/05-normies-canvas.mp3",
  },
  {
    id: 6,
    title: "Burn to Transform",
    theme: "Burn commitments — sacrifice to reshape",
    src: "/playlist/06-burn-to-transform.mp3",
  },
  {
    id: 7,
    title: "Action Points",
    theme: "Level, Pixel Count, canvas progression",
    src: "/playlist/07-action-points.mp3",
  },
  {
    id: 8,
    title: "Prove You're a Normie",
    theme: "Legacy generative ritual — I am Normie",
    src: "/playlist/08-prove-youre-a-normie.mp3",
  },
  {
    id: 9,
    title: "Build Together",
    theme: "Collective movement — Serc & Yigit, builders",
    src: "/playlist/09-build-together.mp3",
  },
  {
    id: 10,
    title: "Ten Thousand On-Chain Faces",
    theme: "The collection — holders, history, agents",
    src: "/playlist/10-ten-thousand-on-chain-faces.mp3",
  },
];
