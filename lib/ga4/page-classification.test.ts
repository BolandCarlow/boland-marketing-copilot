import assert from "node:assert/strict";
import test from "node:test";
import { classifyPage } from "./page-classification.ts";

test("classifies used franchise vehicles before their general brand", () => {
  assert.equal(classifyPage("/vehicle/used/skoda-kodiaq", "Used 2024 Škoda Kodiaq SUV For Sale"), "Used Cars / Skoda");
  assert.equal(classifyPage("/vehicle/volvo-xc60", "Used Volvo XC60 For Sale"), "Used Cars / Volvo");
  assert.equal(classifyPage("/search?make=Peugeot", "Used Peugeot 3008 For Sale"), "Used Cars / Peugeot");
  assert.equal(classifyPage("/vehicle/mazda-cx-5", "Used Mazda CX-5 For Sale"), "Used Cars / Mazda");
});

test("classifies used non-franchise makes separately", () => {
  assert.equal(classifyPage("/vehicle/ford-focus", "Used Ford Focus For Sale"), "Used Cars / Non-Franchised");
  assert.equal(classifyPage("/search?make=Volkswagen", "Used Volkswagen Golf For Sale"), "Used Cars / Non-Franchised");
});

test("keeps new franchise pages in their general brand categories", () => {
  assert.equal(classifyPage("/skoda/kodiaq", "New Škoda Kodiaq"), "Skoda");
  assert.equal(classifyPage("/volvo/xc60", "New Volvo XC60"), "Volvo");
});
