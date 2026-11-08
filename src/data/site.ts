// Fixed site settings. Page text lives in src/content/site.json, which you can
// edit by hand or with the owner-only Edit button on the page.
import content from '../content/site.json';
export { content };

export const site = {
  name: 'Ryan Kim',
  // Short name shown top-left in the nav, followed by an accent-colored period.
  brand: 'ryan',
  location: 'Evanston, IL',
  email: 'ryan.kim3@kellogg.northwestern.edu',
  links: {
    github: 'https://github.com/ryandkim',
    linkedin: '', // add your LinkedIn URL
  },
};

export const nav = [
  { href: '/#about', label: 'About' },
  { href: '/#journey', label: 'Journey' },
  { href: '/quest', label: 'Career quest' },
  { href: '/#projects', label: 'Projects' },
  { href: '/#beyond', label: 'Beyond work' },
  { href: '/#contact', label: 'Contact' },
];
