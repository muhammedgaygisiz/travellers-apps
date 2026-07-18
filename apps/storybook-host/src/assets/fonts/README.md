# noto-color-emoji-subset.woff2

A subset of [Noto Color Emoji](https://github.com/googlefonts/noto-emoji)
(SIL Open Font License 1.1), containing only the emoji that can render in
Storybook stories. It is loaded **only in Storybook** (see
`.storybook/preview-head.html`) so that Loki visual-regression references show
consistent colour emoji regardless of the fonts installed in the Docker Chrome
that captures them. Production emoji rendering is unchanged.

## Covered codepoints

U+2B50 ⭐, U+1F389 🎉, U+1F447 👇, U+1F44B 👋, U+1F44D 👍, U+1F924 🤤,
U+1F929 🤩, U+1F92F 🤯

## Regenerating (add codepoints if a new story renders a new emoji)

```sh
pip install fonttools brotli
# Download the Noto Color Emoji unicode-range block(s) that contain the
# codepoints from https://fonts.googleapis.com/css2?family=Noto+Color+Emoji
pyftsubset <block>.woff2 \
  --unicodes=2B50,1F389,1F447,1F44B,1F44D,1F924,1F929,1F92F \
  --output-file=noto-color-emoji-subset.woff2 --flavor=woff2 --glyph-names
```
