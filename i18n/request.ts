import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { COOKIE_IDIOMA, idiomaValido } from '@/lib/idioma';

export default getRequestConfig(async () => {
  const locale = idiomaValido((await cookies()).get(COOKIE_IDIOMA)?.value);
  return { locale, messages: (await import(`../messages/${locale}.json`)).default };
});
