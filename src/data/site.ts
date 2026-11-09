// Fixed site settings. Page text lives in src/content/site.json, which you can
// edit by hand or with the owner-only Edit button on the page.
import content from '../content/site.json';
export { content };

export const site = {
  name: content.name,
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
  { id: 'about', href: '/#about' },
  { id: 'journey', href: '/#journey' },
  { id: 'quest', href: '/quest' },
  { id: 'projects', href: '/#projects' },
  { id: 'beyond', href: '/#beyond' },
  { id: 'contact', href: '/#contact' },
].map((n) => ({ ...n, label: content.nav[n.id as keyof typeof content.nav] }));
