const fs = require('node:fs/promises');
const path = require('node:path');
const { marked } = require('marked');

const rootDir = __dirname;
const notesDir = path.join(rootDir, 'notes');
const distDir = path.join(rootDir, 'dist');

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function wrapPage(title, body, includeBackLink) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; background: #f7f7f7; color: #222; }
    main { max-width: 720px; margin: 0 auto; padding: 2rem 1.5rem 3rem; }
    a { color: #0b57d0; }
    article, nav { background: #fff; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); }
    article + nav, nav + article { margin-top: 1rem; }
    @media print {
      body { background: #fff; color: #000; }
      main { max-width: 100%; padding: 0; }
      nav, a[href]::after { display: none; }
      article { box-shadow: none; border-radius: 0; padding: 0; }
    }
  </style>
</head>
<body>
  <main>
    ${includeBackLink ? '<p><a href="./index.html">← Back to index</a></p>' : ''}
    <article>
${body}
    </article>
  </main>
</body>
</html>
`;
}

function extractTitle(markdown, fallbackTitle) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallbackTitle;
}

async function buildSite() {
  const entries = await fs.readdir(notesDir, { withFileTypes: true });
  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });

  const pages = [];

  for (const fileName of markdownFiles) {
    const inputPath = path.join(notesDir, fileName);
    const markdown = await fs.readFile(inputPath, 'utf8');
    const title = extractTitle(markdown, fileName.replace(/\.md$/, ''));
    const html = marked.parse(markdown);
    const outputFileName = fileName.replace(/\.md$/, '.html');

    await fs.writeFile(
      path.join(distDir, outputFileName),
      wrapPage(title, html, true),
      'utf8'
    );

    pages.push({ fileName: outputFileName, title });
  }

  const indexBody = `<h1>Notes Index</h1>
<ul>
${pages.map((page) => `  <li><a href="./${page.fileName}">${escapeHtml(page.title)}</a></li>`).join('\n')}
</ul>`;

  await fs.writeFile(path.join(distDir, 'index.html'), wrapPage('Notes Index', indexBody, false), 'utf8');
}

buildSite().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
