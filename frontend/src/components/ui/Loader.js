import React from 'react';
import PropTypes from 'prop-types';

/**
 * ローディングコンポーネント
 * @param {object} props props
 * @param {string} props.size サイズ（'xs', 'sm', 'md', 'lg'）
 * @param {string} props.color 色
 * @param {string} props.className 追加のクラス名
 * @param {string} props.text 表示テキスト
 */
const Loader = ({ size = 'md', color = 'primary', className = '', text = '' }) => {
  // サイズに応じたクラス
  const sizeClass = {
    xs: 'h-4 w-4 border-2',
    sm: 'h-6 w-6 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-10 w-10 border-3',
    xl: 'h-12 w-12 border-4'
  }[size] || 'h-8 w-8 border-2';
  
  // 色に応じたクラス
  const colorClass = {
    primary: 'border-primary-600',
    secondary: 'border-secondary-600',
    accent: 'border-accent-600',
    success: 'border-success-600',
    info: 'border-info-600',
    warning: 'border-warning-600',
    error: 'border-error-600',
    gray: 'border-gray-600'
  }[color] || 'border-primary-600';
  
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full ${sizeClass} border-t-transparent ${colorClass}`}></div>
      {text && <span className="ml-3">{text}</span>}
    </div>
  );
};

Loader.propTypes = {
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  color: PropTypes.oneOf([
    'primary', 'secondary', 'accent', 'success', 
    'info', 'warning', 'error', 'gray'
  ]),
  className: PropTypes.string,
  text: PropTypes.string
};

export default Loader; 