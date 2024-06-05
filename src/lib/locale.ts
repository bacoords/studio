import { app } from 'electron';
import path from 'path';
import { match } from '@formatjs/intl-localematcher';
import * as Sentry from '@sentry/electron/main';
import fs from 'fs-extra';
import { getResourcesPath } from '../storage/paths';
import type { LocaleData } from '@wordpress/i18n';

export const DEFAULT_LOCALE = 'en';

let currentLocale = DEFAULT_LOCALE;

const supportedLocales = [
	'ar',
	'de',
	'en',
	'es',
	'fr',
	'he',
	'id',
	'it',
	'ja',
	'ko',
	'nl',
	'pl',
	'pt-br',
	'ru',
	'sv',
	'tr',
	'zh-cn',
	'zh-tw',
];

export function getSupportedLocale(): string {
	// `app.getLocale` returns the current application locale, acquired using
	// Chromium's `l10n_util` library. This value is utilized to determine
	// the best fit for supported locales.
	return match( [ app.getLocale() ], supportedLocales, DEFAULT_LOCALE );
}

export async function getLocaleData( locale: string ): Promise< LocaleData | null > {
	if ( locale === DEFAULT_LOCALE || ! supportedLocales.includes( locale ) ) {
		return null;
	}

	try {
		const translationsPath = path.join( getResourcesPath(), 'translations' );
		const translationFile = JSON.parse(
			await fs.readFile( path.join( translationsPath, `studio-${ locale }.jed.json` ), 'utf8' )
		) as LocaleData;
		return translationFile;
	} catch ( err ) {
		console.error( `Failed to load locale data for "${ locale }"`, err );
		Sentry.captureException( err );
		return null;
	}
}

export function setCurrentLocale( locale: string ) {
	currentLocale = locale;
}

export function getCurrentLocale() {
	return currentLocale;
}
