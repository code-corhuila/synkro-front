import { Link, type LinkProps } from 'react-router-dom';
import './Button.css';

type Variant = 'primary' | 'secondary';

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
}

// A navigation that looks like the shared Button (design-system.md, Buttons).
// It stays a real link, so it is a client-side route change and never a
// document load: the in-memory session survives it.
export function ButtonLink({ variant = 'primary', className, ...rest }: ButtonLinkProps) {
  const classes = ['button', `button--${variant}`, className].filter(Boolean).join(' ');

  return <Link className={classes} {...rest} />;
}
