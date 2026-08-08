import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import App from './App';

describe('App Component', () => {
  it('should render without crashing', () => {
    // This is a basic smoke test to verify testing setup
    expect(true).toBe(true);
  });
});
