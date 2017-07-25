import React from 'react';
import Field from '../Field';
import { GlyphButton, FormInput } from '../../../admin/client/App/elemental';

const isImageUrl = (url) => {
	const pattern = /\w\.(png|jpg|jpeg|gif)$/i;
	return pattern.test(url.split('?').shift());
};

module.exports = Field.create({
	displayName: 'URLField',
	statics: {
		type: 'Url',
	},
	openValue () {
		var href = this.props.value;
		if (!href) return;
		if (!/^(mailto\:)|(\w+\:\/\/)/.test(href)) {
			href = 'http://' + href;
		}
		window.open(href);
	},
	renderLink () {
		if (!this.props.value) return null;
		if (isImageUrl(this.props.value)) return null;

		return (
			<GlyphButton
				className="keystone-relational-button"
				glyph="link"
				onClick={this.openValue}
				title={'Open ' + this.props.value + ' in a new tab'}
				variant="link"
			/>
		);
	},
	renderThumbnail () {
		if (!this.props.value) return null;
		if (!isImageUrl(this.props.value)) return null;

		return (
			<div>
				<img
					style={{ maxWidth: '200px' }}
					src={this.props.value}
					className="keystone-image-thumbnail"
					onClick={this.openValue}
					onLoad={e => {
						const img = new Image();
						img.src = e.target.src;
						this.setState({ realSize: { width: e.target.naturalWidth || img.width, height: e.target.naturalHeight || img.height } });
					}}
					title={'Open ' + this.props.value + ' in a new tab'}
					width="100%"
				/>
				{this.state.realSize &&
					<span style={{
						position: 'absolute',
						left: '0px',
						color: '#fff',
						fontSize: 'large',
					}}
					>
						{this.state.realSize.width + ' * ' + this.state.realSize.height}
					</span>
				}
			</div>
		);
	},
	renderInput () {
		return (
			<FormInput
				autoComplete="off"
				name={this.getInputName(this.props.path)}
				onChange={this.valueChanged}
				ref="focusTarget"
				type="url"
				value={this.props.value}
			/>
		);
	},
	renderField () {
		return (
			<div style={{ position: 'relative' }}>
				{this.renderInput()}
				{this.renderLink()}
				{this.renderThumbnail()}
			</div>
		);
	},
	renderValue () {
		const { value } = this.props;
		return (
			<FormInput noedit onClick={value && this.openValue}>
				{value}
			</FormInput>
		);
	},
});
