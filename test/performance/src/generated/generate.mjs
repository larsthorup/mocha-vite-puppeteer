import * as fs from 'fs';

const count = 100;
const folder = 'src/generated';
const fileNames = ['ComponentXXX.jsx', 'ComponentXXX.test.jsx'];
const sources = fileNames.map((fileName) =>
  fs.readFileSync(`${folder}/${fileName}`, 'utf-8')
);

for (let i = 100; i < 100 + count; ++i) {
  const xxx = i.toString();
  for (let f = 0; f < fileNames.length; ++f) {
    const fileName = fileNames[f];
    const source = sources[f];
    // console.log(fileName, source);
    const targetFileName = fileName.replace(/XXX/g, xxx);
    const targetSource = source.replace(/XXX/g, xxx);
    fs.writeFileSync(`${folder}/${targetFileName}`, targetSource);
  }
}
