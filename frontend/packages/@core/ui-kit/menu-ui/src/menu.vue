<script setup lang="ts">
import type { MenuRecordRaw } from '@vben-core/typings';

import type { MenuProps } from './types';

import { computed } from 'vue';

import { useForwardProps } from '@vben-core/composables';

import { Menu } from './components';
import { hasMenuGroup, shouldRenderMenuGroup } from './menu-group';
import SubMenu from './sub-menu.vue';

interface Props extends MenuProps {
  menus: MenuRecordRaw[];
}

defineOptions({
  name: 'MenuView',
});

const props = withDefaults(defineProps<Props>(), {
  collapse: false,
});

const forward = useForwardProps(props);

const groupedMenu = computed(() => hasMenuGroup(props.menus));
</script>

<template>
  <Menu v-bind="forward" :class="{ 'is-grouped': groupedMenu }">
    <template v-for="(menu, index) in menus" :key="menu.path">
      <li
        v-if="shouldRenderMenuGroup(menus, index, mode, collapse)"
        class="vben-menu-item-group__title"
        role="presentation"
      >
        {{ menu.menuGroup }}
      </li>
      <SubMenu :menu="menu" />
    </template>
  </Menu>
</template>
