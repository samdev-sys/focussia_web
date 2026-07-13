import { sileo } from 'sileo';

export const notify = {
  success: (title: string, description?: string) =>
    sileo.success({ title, description }),
  error: (title: string, description?: string) =>
    sileo.error({ title, description }),
  warning: (title: string, description?: string) =>
    sileo.warning({ title, description }),
  info: (title: string, description?: string) =>
    sileo.info({ title, description }),
  action: (title: string, button: { title: string; onClick: () => void }, description?: string) =>
    sileo.action({ title, description, button }),
  promise: <T>(
    promise: Promise<T> | (() => Promise<T>),
    opts: { loading: string; success: string; error: string }
  ) =>
    sileo.promise(promise, {
      loading: { title: opts.loading },
      success: { title: opts.success },
      error: { title: opts.error },
    }),
};
