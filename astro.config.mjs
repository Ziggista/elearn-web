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
          label: 'PKI & TLS',
          items: [
            { label: 'Training', slug: 'pki-tls' },
            { label: 'Quiz', slug: 'pki-tls/quiz' },
            { label: 'Presenter guide', slug: 'pki-tls/presenter-guide' },
          ],
        },
      ],
    }),
  ],
});
