import { B } from "./balance";
export const skins = [
  {
    id: "classic",
    name: "Classic Snake",
    price: B.prices[0],
    color: 0x8ade62,
    dark: 0x3a9253,
    detail: "classic",
  },
  {
    id: "cat",
    name: "Cat Snake",
    price: B.prices[1],
    color: 0xffbc85,
    dark: 0xcf795d,
    detail: "cat",
  },
  {
    id: "robot",
    name: "Robot Snake",
    price: B.prices[2],
    color: 0x8ed8ea,
    dark: 0x44899f,
    detail: "robot",
  },
  {
    id: "dino",
    name: "Dino Snake",
    price: B.prices[3],
    color: 0x92cf64,
    dark: 0x568340,
    detail: "dino",
  },
  {
    id: "dragon",
    name: "Dragon Snake",
    price: B.prices[4],
    color: 0xc49bff,
    dark: 0x835db6,
    detail: "dragon",
  },
] as const;
export type Skin = (typeof skins)[number];
