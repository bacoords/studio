import * as Sentry from '@sentry/electron/renderer';
import { useI18n } from '@wordpress/react-i18n';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './use-auth';
import { useOffline } from './use-offline';
import { useSiteDetails } from './use-site-details';

export interface SnapshotStatusResponse {
	is_deleted: string;
	domain_name: string;
	atomic_site_id: string;
	status: '1' | '2';
}
export function useDeleteSnapshot( options: { displayAlert?: boolean } = {} ) {
	const { displayAlert = true } = options;
	const [ isLoading, setIsLoading ] = useState( false );
	const [ loadingDeletingAllSnapshots, setLoadingDeletingAllSnapshots ] = useState( false );
	const { client } = useAuth();
	const { removeSnapshot, snapshots, updateSnapshot } = useSiteDetails();
	const { __ } = useI18n();
	const isOffline = useOffline();
	useEffect( () => {
		if ( ! client?.req || isOffline ) {
			return;
		}
		const deletingSnapshots = snapshots.filter( ( snapshot ) => snapshot.isDeleting );
		if ( deletingSnapshots.length === 0 ) {
			setLoadingDeletingAllSnapshots( false );
			return;
		}
		const intervalId = setInterval( async () => {
			for ( const snapshot of deletingSnapshots ) {
				if ( snapshot.isDeleting ) {
					try {
						const resp: SnapshotStatusResponse = await client.req.get( '/jurassic-ninja/status', {
							apiNamespace: 'wpcom/v2',
							site_id: snapshot.atomicSiteId,
						} );
						if ( parseInt( resp.is_deleted ) === 1 ) {
							removeSnapshot( snapshot );
						}
					} catch ( error ) {
						// This error occurs in the background, so we report it but do not
						// alert the user.
						Sentry.captureException( error );
					}
				}
			}
		}, 3000 );
		return () => {
			clearInterval( intervalId );
		};
	}, [ client?.req, isOffline, removeSnapshot, snapshots ] );

	const deleteSnapshot = useCallback(
		async ( snapshot: Pick< Snapshot, 'atomicSiteId' > ) => {
			if ( ! client ) {
				// No-op if logged out
				return;
			}

			setIsLoading( true );
			try {
				const response: { message: string } = await client.req.post( {
					path: '/jurassic-ninja/delete',
					apiNamespace: 'wpcom/v2',
					body: { site_id: snapshot.atomicSiteId },
				} );
				updateSnapshot( {
					...snapshot,
					isDeleting: true,
				} );
				return response;
			} catch ( error ) {
				if ( ( error as WpcomNetworkError )?.code === 'rest_site_already_deleted' ) {
					removeSnapshot( snapshot );
					return;
				}
				if ( displayAlert ) {
					alert( __( 'Error removing demo site. Please try again or contact support.' ) );
				}
				Sentry.captureException( error );
			} finally {
				setIsLoading( false );
			}
		},
		[ client, updateSnapshot, displayAlert, removeSnapshot, __ ]
	);

	const deleteAllSnapshots = useCallback(
		async ( snapshots: Pick< Snapshot, 'atomicSiteId' >[] ) => {
			setLoadingDeletingAllSnapshots( true );
			await Promise.allSettled( snapshots.map( deleteSnapshot ) );
		},
		[ deleteSnapshot ]
	);
	return { deleteSnapshot, deleteAllSnapshots, isLoading, loadingDeletingAllSnapshots };
}
