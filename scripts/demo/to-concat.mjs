// Turns a recording's frames.json into an ffmpeg concat list with real frame timings.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
const dir = path.resolve(process.argv[2]);
const frames = JSON.parse(readFileSync(path.join(dir, "frames.json"), "utf8"));
let out = "";
frames.forEach((f, i) => {
  const d = i + 1 < frames.length ? frames[i + 1].t - f.t : 2.5;
  out += `file '${f.file}'\nduration ${d.toFixed(4)}\n`;
});
out += `file '${frames.at(-1).file}'\n`;
writeFileSync(path.join(dir, "concat.txt"), out);
const marks = JSON.parse(readFileSync(path.join(dir, "marks.json"), "utf8"));
console.log(marks.map((m) => `${m.name} ${(m.t - frames[0].t).toFixed(2)}`).join("\n"));
