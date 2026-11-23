import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://elearn.ziggi.dev',
  integrations: [
    starlight({
      title: 'eLearn',
      description: 'Short IT training sessions.',
      sidebar: [
        {
          label: 'Corp Apps session',
          items: [
            { label: 'Present: Seb, Clint and the padlock', link: '/present/tls-trust/', attrs: { target: '_blank' } },
            { label: 'Download handout (PDF)', link: '/downloads/seb-clint-padlock-handout.pdf', attrs: { target: '_blank' } },
            { label: 'Session notes (Seb & Clint)', slug: 'pki-tls/tls-trust' },
            { label: 'Our PKI: getting a certificate', slug: 'pki-tls/our-pki' },
          ],
        },
        {
          label: 'Background reading',
          items: [
            { label: 'PKI & TLS overview', slug: 'pki-tls' },
          ],
        },
        {
          label: 'Deep dives',
          items: [
            { label: 'History: SSL to TLS 1.3', slug: 'pki-tls/history' },
            { label: 'Middlemen and click-through', slug: 'pki-tls/middlemen' },
            { label: 'Private keys and ISM-0507', slug: 'pki-tls/private-keys' },
            { label: 'Java keystores and Tomcat', slug: 'pki-tls/java-tomcat' },
          ],
        },
        {
          label: 'Wrap-up',
          items: [
            { label: 'Quiz', slug: 'pki-tls/quiz' },
            { label: 'Presenter guide', slug: 'pki-tls/presenter-guide' },
          ],
        },
      ],
    }),
  ],
});
