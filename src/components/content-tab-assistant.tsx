import { useI18n } from '@wordpress/react-i18n';
import hljs from 'highlight.js';
import React, { useState, useEffect, useRef } from 'react';
import { Remarkable } from 'remarkable';
import { Message as AssistantMessage, useAssistant } from '../hooks/use-assistant';
import { useAssistantApi } from '../hooks/use-assistant-api';
import { cx } from '../lib/cx';
import { getIpcApi } from '../lib/get-ipc-api';
import { MessageThinking } from './assistant-thinking';
import Button from './button';
import { AssistantIcon } from './icons/assistant';
import { MenuIcon } from './icons/menu';
import '../assistant-markdown.css';

const md = new Remarkable( {
	highlight: function ( str, lang ) {
		if ( lang && hljs.getLanguage( lang ) ) {
			try {
				return hljs.highlight( lang, str ).value;
			} catch ( err ) {}
		}

		try {
			return hljs.highlightAuto( str ).value;
		} catch ( err ) {}

		return ''; // use external default escaping
	},
} );

interface ContentTabAssistantProps {
	selectedSite: SiteDetails;
}

interface MessageProps {
	children: React.ReactNode;
	isUser: boolean;
}

export const Message = ( { children, isUser }: MessageProps ) => (
	<div className={ cx( 'flex mb-2 mt-2', isUser ? 'justify-end' : 'justify-start' ) }>
		<div
			className={ cx(
				'inline-block p-3 rounded-sm border border-gray-300 lg:max-w-[70%] select-text',
				! isUser && 'bg-white'
			) }
		>
			{ typeof children === 'string' ? (
				<div
					id="assistant-markdown"
					dangerouslySetInnerHTML={ { __html: md.render( children ) } }
				/>
			) : (
				children
			) }
		</div>
	</div>
);

export function ContentTabAssistant( { selectedSite }: ContentTabAssistantProps ) {
	const { messages, addMessage, clearMessages } = useAssistant( selectedSite.name );
	const { fetchAssistant, isLoading: isAssistantThinking } = useAssistantApi();
	const [ input, setInput ] = useState< string >( '' );
	const endOfMessagesRef = useRef< HTMLDivElement >( null );
	const { __ } = useI18n();

	const handleSend = async () => {
		if ( input.trim() ) {
			const userMessage: AssistantMessage = { content: input, role: 'user' };
			addMessage( userMessage.content, userMessage.role );
			setInput( '' );
			try {
				const { message } = await fetchAssistant( [ ...messages, userMessage ] );
				if ( message ) {
					const assistantMessage: AssistantMessage = { content: message, role: 'assistant' };
					addMessage( assistantMessage.content, assistantMessage.role );
				}
			} catch ( error ) {
				setTimeout(
					() =>
						getIpcApi().showMessageBox( {
							type: 'warning',
							message: __( 'Failed to send message' ),
							detail: __( "We couldn't send the latest message. Please try again." ),
							buttons: [ __( 'OK' ) ],
						} ),
					100
				);
			}
		}
	};

	const handleKeyDown = ( e: React.KeyboardEvent< HTMLInputElement > ) => {
		if ( e.key === 'Enter' ) {
			handleSend();
		}
	};

	const clearInput = () => {
		setInput( '' );
		clearMessages();
	};

	useEffect( () => {
		if ( endOfMessagesRef.current ) {
			endOfMessagesRef.current.scrollIntoView( { behavior: 'smooth' } );
		}
	}, [ messages ] );

	return (
		<div className="h-full flex flex-col bg-gray-50">
			<div data-testid="assistant-chat" className="flex-1 overflow-y-auto p-8">
				<div className="text-gray-500 mb-4">
					Welcome to the Studio assistant. I can help manage your site, debug issues, and navigate
					your way around the WordPress ecosystem.
				</div>
				<div>
					{ messages.map( ( message, index ) => (
						<Message key={ index } isUser={ message.role === 'user' }>
							{ message.content }
						</Message>
					) ) }
					{ isAssistantThinking && (
						<Message isUser={ false }>
							<MessageThinking />
						</Message>
					) }
					<div ref={ endOfMessagesRef } />
				</div>
			</div>
			<div
				data-testid="assistant-input"
				className="px-8 py-6 bg-white flex items-center border-t border-gray-200 sticky bottom-0"
			>
				<div className="relative flex-1">
					<input
						type="text"
						placeholder="Ask Studio WordPress Assistant"
						className="w-full p-3 rounded-sm border-black border ltr:pl-8 rtl:pr-8"
						value={ input }
						onChange={ ( e ) => setInput( e.target.value ) }
						onKeyDown={ handleKeyDown }
					/>
					<div className="absolute top-1/2 transform -translate-y-1/2 ltr:left-3 rtl:left-auto rtl:right-3 pointer-events-none">
						<AssistantIcon />
					</div>
				</div>
				<Button aria-label="menu" className="p-2 ml-2 cursor-pointer" onClick={ clearInput }>
					<MenuIcon />
				</Button>
			</div>
		</div>
	);
}
