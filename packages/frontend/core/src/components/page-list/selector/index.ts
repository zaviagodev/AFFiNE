import { SelectCollection } from '../collections';
import { SelectTag } from '../tags';
import { SelectPage } from '../view/edit-collection/select-page';
import { useSelectDialog } from './use-select-dialog';

export * from './use-select-dialog';

/**
 * Return a `open` function to open the select collection dialog.
 */
export const useSelectCollection = () => {
  return useSelectDialog(SelectCollection, 'select-collection');
};

/**
 * Return a `open` function to open the select page dialog.
 */
export const useSelectDoc = () => {
  return useSelectDialog(SelectPage, 'select-doc-dialog');
};

/**
 * Return a `open` function to open the select tag dialog.
 */
export const useSelectTag = () => {
  return useSelectDialog(SelectTag, 'select-tag-dialog');
};
