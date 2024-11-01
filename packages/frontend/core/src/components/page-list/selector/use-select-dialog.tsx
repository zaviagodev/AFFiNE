import { Modal, type ModalProps } from '@affine/component';
import { useMount } from '@toeverything/infra';
import { cssVar } from '@toeverything/theme';
import { useCallback, useEffect, useState } from 'react';

export interface BaseSelectorDialogProps<T> {
  init?: T;
  onConfirm?: (data: T) => void;
  onCancel?: () => void;
}

const defaultModalProps: Partial<Omit<ModalProps, 'children'>> = {};
export const useSelectDialog = function useSelectDialog<T, P>(
  Component: React.FC<BaseSelectorDialogProps<T> & P>,
  debugKey?: string,
  options?: {
    modalProps?: Partial<Omit<ModalProps, 'children'>>;
  }
) {
  // to control whether the dialog is open, it's not equal to !!value
  // when closing the dialog, show will be `false` first, then after the animation, value turns to `undefined`
  const [show, setShow] = useState(false);
  const [value, setValue] = useState<{
    init?: T;
    onConfirm: (v: T) => void;
  }>();
  const [additionalProps, setAdditionalProps] = useState<P>();

  const onOpenChanged = useCallback((open: boolean) => {
    if (!open) setValue(undefined);
    setShow(open);
  }, []);

  const close = useCallback(() => setShow(false), []);

  /**
   * Open a dialog to select items
   */
  const open = useCallback(
    (ids?: T, additionalProps?: P) => {
      return new Promise<T>(resolve => {
        setShow(true);
        setAdditionalProps(additionalProps);
        setValue({
          init: ids,
          onConfirm: list => {
            close();
            resolve(list);
          },
        });
      });
    },
    [close]
  );

  const { mount } = useMount(debugKey);

  useEffect(() => {
    const { contentOptions, ...otherModalProps } =
      options?.modalProps ?? defaultModalProps;

    return mount(
      <Modal
        open={show}
        onOpenChange={onOpenChanged}
        withoutCloseButton
        width="calc(100% - 32px)"
        height="80%"
        contentOptions={{
          style: {
            padding: 0,
            maxWidth: 976,
            background: cssVar('backgroundPrimaryColor'),
          },
          ...contentOptions,
        }}
        {...otherModalProps}
      >
        {value ? (
          <Component
            init={value.init}
            onCancel={close}
            onConfirm={value.onConfirm}
            {...(additionalProps as any)}
          />
        ) : null}
      </Modal>
    );
  }, [
    Component,
    additionalProps,
    close,
    debugKey,
    mount,
    onOpenChanged,
    options?.modalProps,
    show,
    value,
  ]);

  return open;
};
