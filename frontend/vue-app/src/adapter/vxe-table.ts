import type { ComponentPropsMap, ComponentType } from './component';

import {
  setupVbenVxeTable,
  useVbenVxeGrid as useGrid,
} from '@vben/plugins/vxe-table';

import { useVbenForm } from './form';

setupVbenVxeTable({
  configVxeTable: (vxeUI) => {
    vxeUI.setConfig({
      grid: {
        align: 'left',
        // 统一使用完整网格线表格样式；height: 'auto' 让表格高度自适应父容器、表体内部滚动（页面不滚动）
        border: true,
        columnConfig: { resizable: true },
        height: 'auto',
        minHeight: 180,
        proxyConfig: {
          response: { list: 'items', result: 'items', total: 'total' },
          showActiveMsg: true,
          showResponseMsg: false,
        },
        round: true,
        showOverflow: true,
        size: 'small',
      },
    } as never);
  },
  useVbenForm,
});

export const useVbenVxeGrid = <
  T extends Record<string, any>,
>(
  ...rest: Parameters<typeof useGrid<T, ComponentType, ComponentPropsMap>>
) => useGrid<T, ComponentType, ComponentPropsMap>(...rest);

export type * from '@vben/plugins/vxe-table';

export type { VbenFormProps, VbenFormSchema } from './form';
