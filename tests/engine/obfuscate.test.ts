import { describe, expect, it } from "vitest";
import { deobfuscateText, obfuscateText } from "@/engine/content/obfuscate";

describe("obfuscateText / deobfuscateText", () => {
  it("bolak-balik mengembalikan teks asli", () => {
    const text = "SELECT nama FROM penduduk WHERE nik = '9971020502900002';";
    const encoded = obfuscateText(text, "salt-chapter-1");
    expect(deobfuscateText(encoded, "salt-chapter-1")).toBe(text);
  });

  it("menangani teks Unicode (bahasa Indonesia dengan tanda baca)", () => {
    const text = "Kolom \"nik_pemilik\" — jangan lupa kutip tunggal untuk teks 'samping'.";
    const encoded = obfuscateText(text, "garam-acak");
    expect(deobfuscateText(encoded, "garam-acak")).toBe(text);
  });

  it("hasil obfuscate bukan teks polos (tidak memuat query asli)", () => {
    const text = "SELECT * FROM tersangka_rahasia";
    const encoded = obfuscateText(text, "s");
    expect(encoded).not.toContain("tersangka_rahasia");
  });

  it("salt yang salah tidak menghasilkan teks asli", () => {
    const text = "SELECT 1";
    const encoded = obfuscateText(text, "salt-benar");
    expect(deobfuscateText(encoded, "salt-salah")).not.toBe(text);
  });
});
