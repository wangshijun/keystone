/**
 * The App component is the component that is rendered around all views, and
 * contains common things like navigation, footer, etc.
 */

import React from 'react';
import { Container } from './elemental';
import { Link } from 'react-router';
import { css, StyleSheet } from 'aphrodite/no-important';

import MobileNavigation from './components/Navigation/Mobile';
import PrimaryNavigation from './components/Navigation/Primary';
import SecondaryNavigation from './components/Navigation/Secondary';
import Footer from './components/Footer';

const classes = StyleSheet.create({
	wrapper: {
		display: 'flex',
		flexDirection: 'column',
		minHeight: '100vh',
	},
	body: {
		flexGrow: 1,
		position: 'relative',
	},
});

const App = (props) => {
	const listsByPath = require('../utils/lists').listsByPath;
	let children = props.children;
	// If we're on either a list or an item view
	let currentList, currentSection;
	let customSecondaryNav = null;
	if (props.params.listId) {
		currentList = listsByPath[props.params.listId];
		const parentKey = props.params.listId.split('-')[0];
		const byList = Keystone.nav.by.list[parentKey];

		if (byList && byList.lists[0] && byList.lists[0].customPage) {
			let parentSection = byList.lists[0];
			let section = parentSection;

			if (Array.isArray(parentSection.links)) {
				section = parentSection.links.find(x => x.key === props.params.listId);
				customSecondaryNav = parentSection.links;
			}

			children = (
				<Container style={{ height: '100%', position: 'absolute', margin: 'auto', top: 0, bottom: 0, right: 0, left: 0 }}>
					<iframe src={section.targetUrl} seamless style={{ border: 0, width: '100%', height: '100%' }}></iframe>
				</Container>
			);
		// If we're on a list path that doesn't exist (e.g. /keystone/gibberishasfw34afsd) this will
		// be undefined
		} else if (!currentList) {
			children = (
				<Container>
					<p>List not found!</p>
					<Link to={`${Keystone.adminPath}`}>
						Go back home
					</Link>
				</Container>
			);
		} else {
			// Get the current section we're in for the navigation
			currentSection = Keystone.nav.by.list[currentList.key];
		}
	}
	// Default current section key to dashboard
	const currentSectionKey = (currentSection && currentSection.key) || 'dashboard';
	return (
		<div className={css(classes.wrapper)}>
			<header>
				<MobileNavigation
					brand={Keystone.brand}
					currentListKey={props.params.listId}
					currentSectionKey={currentSectionKey}
					sections={Keystone.nav.sections}
					signoutUrl={Keystone.signoutUrl}
				/>
				<PrimaryNavigation
					currentSectionKey={currentSectionKey}
					brand={Keystone.brand}
					sections={Keystone.nav.sections}
					signoutUrl={Keystone.signoutUrl}
				/>
				{/* If a section is open currently, show the secondary nav */}
				{(customSecondaryNav || currentSection) ? (
					<SecondaryNavigation
						currentListKey={props.params.listId}
						lists={customSecondaryNav || currentSection.lists}
						itemId={props.params.itemId}
					/>
				) : null}
			</header>
			<main className={css(classes.body)}>
				{children}
			</main>
			<Footer
				appversion={Keystone.appversion}
				backUrl={Keystone.backUrl}
				brand={Keystone.brand}
				User={Keystone.User}
				user={Keystone.user}
				version={Keystone.version}
			/>
		</div>
	);
};

module.exports = App;
