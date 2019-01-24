import React from 'react';
import { NavLink } from 'react-router-dom';
import { themeSettings, text } from '../../lib/settings';

export default class SearchBox extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			value: props.value,
			hasFocus: false
		};
	}

	handleChange = event => {
		this.setState({ value: event.target.value });
	};

	handleKeyPress = e => {
		if (e.keyCode === 13 || e.which === 13) {
			this.handleSearch();
		}
	};

	handleKeyDown = e => {
		if (e.keyCode === 27) {
			this.handleClear();
		}
	};

	handleSearch = () => {
		console.log('clicked');
		this.props.onSearch(this.state.value);
	};

	handleClear = () => {
		this.setState({ value: '' });
		this.props.onSearch('');
	};

	handleFocus = () => {
		this.setState({ hasFocus: true });
	};

	handleBlur = () => {
		this.setState({ hasFocus: false });
	};

	render() {
		const { hasFocus } = this.state;
		const placeholderText =
			themeSettings.search_placeholder &&
			themeSettings.search_placeholder.length > 0
				? themeSettings.search_placeholder
				: text.searchPlaceholder;

		return (
			<div
				className={
					'search-box ' + this.props.className + (hasFocus ? ' has-focus' : '')
				}
			>
				<input
					className="search-input"
					type="text"
					placeholder={placeholderText}
					value={this.state.value}
					onChange={this.handleChange}
					onKeyPress={this.handleKeyPress}
					onKeyDown={this.handleKeyDown}
					onFocus={this.handleFocus}
					onBlur={this.handleBlur}
				/>
				<img
					className="search-icon-search"
					src="https://www.google.co.in/logos/doodles/2019/lev-landaus-111th-birthday-5630512767959040.2-s.png"
					alt={text.search}
					title={text.search}
					onClick={this.handleSearch}
				/>
				{this.state.value &&
					this.state.value !== '' && (
						<img
							className="search-icon-clear"
							src="/assets/images/close.svg"
							onClick={this.handleClear}
						/>
					)}
			</div>
		);
	}
}
