import { mkdir, writeFile } from 'node:fs/promises';

const directory = new URL('../apps/web/public/art/cosmetics/', import.meta.url);
await mkdir(directory, { recursive: true });
const characters = [
  ['star-scout', 'Star Scout', 'R', '#71d6cd', '#163d55', '#19374b'],
  ['moon-courier', 'Moon Courier', 'R', '#a2b6ed', '#282456', '#8d9bcb'],
  ['solar-knight', 'Solar Knight', 'R', '#e9ae68', '#563224', '#542f29'],
  ['comet-mage', 'Comet Mage', 'SR', '#bd9de8', '#3b245c', '#412856'],
  ['eclipse-oracle', 'Eclipse Oracle', 'SR', '#e5a2ba', '#4c264d', '#d4b9d6'],
  ['astral-empress', 'Astral Empress', 'SSR', '#edd18b', '#323467', '#bed9ec'],
];
const star = '<path d="m128 31 5 13 14 1-11 9 3 14-11-8-12 8 4-14-11-9 14-1z"/>';
const manifest = { version: 'celestial-v1', provenance: 'Original repository-authored SVG geometry; no third-party characters or artwork.', items: [] };
for (const [index, [slug, name, rarity, accent, background, hair]] of characters.entries()) {
  const defs = `<defs><radialGradient id="sky"><stop stop-color="${background}"/><stop offset="1" stop-color="#11182c"/></radialGradient><linearGradient id="cloth" x2="1" y2="1"><stop stop-color="${accent}"/><stop offset="1" stop-color="${background}"/></linearGradient></defs>`;
  const sky = `<rect width="256" height="256" rx="30" fill="url(#sky)"/><g fill="${accent}" opacity=".7"><circle cx="42" cy="52" r="2"/><circle cx="210" cy="74" r="2"/><circle cx="192" cy="32" r="1.5"/><circle cx="28" cy="143" r="1.5"/></g>`;
  const portrait = `<circle cx="128" cy="107" r="78" fill="none" stroke="${accent}" opacity=".22"/><path d="M48 255q4-74 48-83h64q44 9 48 83" fill="url(#cloth)"/><path d="M81 107q-9-68 47-69 61 2 49 78l11 77-35-21H94l-26 20z" fill="${hair}"/><path d="M105 160v23l23 16 23-16v-23" fill="#deb6a9"/><path d="M87 100q1-45 41-45t41 45v34q-8 43-41 45-32-2-41-45z" fill="#f2d0ba"/><path d="M78 109q-3-73 55-74 54 7 47 83l-24-47-11 27-22-34-38 49z" fill="${hair}"/><path d="m94 120 22-4m24 0 22 4" fill="none" stroke="#39314e" stroke-width="5" stroke-linecap="round"/><g fill="${accent}" stroke="#39314e" stroke-width="2"><ellipse cx="106" cy="129" rx="7" ry="10"/><ellipse cx="150" cy="129" rx="7" ry="10"/></g><g fill="#fff"><circle cx="108" cy="126" r="2.5"/><circle cx="152" cy="126" r="2.5"/></g><path d="m122 151 6 2 6-2m-18 9q12 9 24 0" fill="none" stroke="#a86f75" stroke-width="2" stroke-linecap="round"/><path d="m90 190 38 28 38-28-9 61h-58z" fill="#192238"/><path d="m118 212 10-9 10 9-10 16z" fill="${accent}"/><g fill="${accent}" transform="translate(${index % 2 ? -44 : 0} ${index % 2 ? 31 : 0})">${star}</g>`;
  const back = `<rect x="13" y="13" width="230" height="230" rx="22" fill="none" stroke="${accent}" stroke-width="2"/><rect x="25" y="25" width="206" height="206" rx="17" fill="none" stroke="${accent}" opacity=".3"/><g transform="translate(128 128) rotate(${index * 15})" fill="none" stroke="${accent}"><path d="M0-80 65 0 0 80-65 0z" stroke-width="3"/><circle r="49"/><circle r="37" opacity=".45"/><path d="M-80 0H80M0-80V80" opacity=".3"/><path d="m0-30 9 20 23 3-17 15 5 23-20-12-20 12 5-23-17-15 23-3z" fill="${accent}" stroke="none"/><g fill="${accent}"><circle cy="-68" r="4"/><circle cy="68" r="4"/><circle cx="-58" r="4"/><circle cx="58" r="4"/></g></g>`;
  for (const [slot, suffix, content] of [['avatar', 'avatar', portrait], ['cardBack', 'back', back]]) {
    const file = `${slug}-${suffix}.svg`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img"><title>${name}${slot === 'cardBack' ? ' Card Back' : ''}</title>${defs}${sky}${content}</svg>\n`;
    await writeFile(new URL(file, directory), svg);
    manifest.items.push({ id: `${slug}-${slot}`, name: `${name}${slot === 'cardBack' ? ' Card Back' : ''}`, slot, rarity, assetUrl: `/art/cosmetics/${file}` });
  }
}
await writeFile(new URL('manifest.json', directory), JSON.stringify(manifest, null, 2) + '\n');
