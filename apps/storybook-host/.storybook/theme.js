import { create } from 'storybook/theming';

export default create({
  base: 'dark',
  brandUrl: 'https://bite-tribe.firebaseapp.com',
  brandTitle: 'BiteTribe Design System',
  fontBase: '"Outfit", "Open Sans", sans-serif',
  fontCode: 'monospace',

  brandImage: '/assets/icons/logo.svg',
  brandTarget: '_self',

  textColor: '#fec56b',
  colorSecondary: '#c45b2bff', // Selected story color in the sidebar
  barSelectedColor: '#fec56b', // Selected action in top bar
  barHoverColor: '#c45b2bff', // Hover color of actions in top bar
  barBg: '#1c212b', // Top bar color
  appBg: '#131620', // sidebar left background color
  appContentBg: '#131620', // sidebar right background color
  textInverseColor: '#c45b2bff', // Text color on e.g. error popups
});
