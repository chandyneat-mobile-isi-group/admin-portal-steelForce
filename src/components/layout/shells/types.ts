/**
 * The contract every workspace shell implements.
 *
 * A shell receives the page and the session menu, and nothing else. It has no
 * access to data, no knowledge of which route it is wrapping beyond the
 * pathname it can read itself, and no way to affect authorization — which is
 * what keeps "layout" a presentation concern.
 */
export interface ShellProps {
  children: React.ReactNode;
  /** Injected by the portal layout; shared chrome must not import a feature. */
  profileMenu?: React.ReactNode;
  /** Header notifications control, injected the same way as `profileMenu`. */
  notifications?: React.ReactNode;
}
