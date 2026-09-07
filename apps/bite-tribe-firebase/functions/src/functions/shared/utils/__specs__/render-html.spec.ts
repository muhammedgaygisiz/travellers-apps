import { escapeHtml, renderHtml } from '../render-html';

// The Bite name from issue #1488: the first copy of each metacharacter was
// consumed by the old escape, and the second copy survived into the document.
const XSS_BITE_NAME = `Pizza <>&'"" ><script>alert(document.domain)</script>`;

describe('escapeHtml', () => {
  it('escapes every occurrence, not only the first', () => {
    expect(escapeHtml('a & b & c')).toBe('a &amp; b &amp; c');
    expect(escapeHtml('<a><b>')).toBe('&lt;a&gt;&lt;b&gt;');
    expect(escapeHtml(`"" ''`)).toBe('&quot;&quot; &#039;&#039;');
  });

  it('leaves no raw metacharacter in a multi-occurrence payload', () => {
    const escaped = escapeHtml(XSS_BITE_NAME);

    expect(escaped).not.toMatch(/[<>"']/);
    expect(escaped).not.toMatch(/&(?!amp;|lt;|gt;|quot;|#039;)/);
  });

  it('escapes the ampersand first, so the entities it emits stay intact', () => {
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml(`<&"`)).toBe('&lt;&amp;&quot;');
  });

  it('leaves a name without metacharacters untouched', () => {
    expect(escapeHtml('Pizza Margherita @ Da Michele')).toBe(
      'Pizza Margherita @ Da Michele',
    );
  });
});

describe('renderHtml', () => {
  const render = (title: string, description = 'EUR 12 · ⭐️ 5'): string =>
    renderHtml({
      title,
      description,
      imageUrl: 'https://example.com/bite.jpg',
      canonicalUrl: 'https://bite-tribe.web.app/s/bite/abc',
      redirectUrl: 'https://bite-tribe.web.app/bite/abc',
    });

  it('renders no script element for the crafted Bite name', () => {
    const html = render(XSS_BITE_NAME);

    expect(html).not.toContain('<script');
    expect(html).not.toContain('</script');
  });

  it('keeps the crafted Bite name inside the meta attribute it was given', () => {
    const html = render(XSS_BITE_NAME);
    const ogTitle = html.match(
      /<meta property="og:title" content="([^"]*)" \/>/,
    );

    expect(ogTitle?.[1]).toBe(escapeHtml(XSS_BITE_NAME));
  });

  it('escapes a crafted description as well', () => {
    const html = render('A Bite', `"><script>alert(1)</script>`);

    expect(html).not.toContain('<script');
  });

  it('renders an ordinary Bite name, price and rating unchanged', () => {
    const html = render('Pizza Margherita @ Da Michele', 'EUR 12 · ⭐️ 4.5');

    expect(html).toContain('<title>Pizza Margherita @ Da Michele</title>');
    expect(html).toContain(
      '<meta property="og:title" content="Pizza Margherita @ Da Michele" />',
    );
    expect(html).toContain(
      '<meta property="og:description" content="EUR 12 · ⭐️ 4.5" />',
    );
  });
});
