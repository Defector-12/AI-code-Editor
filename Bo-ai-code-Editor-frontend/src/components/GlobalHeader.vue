<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useLoginUserStore } from '@/stores/loginUser.ts'
import { LogoutOutlined } from '@ant-design/icons-vue'
import { userLogout } from '@/api/userController.ts'
import { type MenuProps, message } from 'ant-design-vue'

type SimpleMenuItem = {
  key: string
  label: string
  title?: string
}

const router = useRouter()
const route = useRoute()
// 获取用户登录状态
const loginUserStore = useLoginUserStore()

// 可通过后续配置替换
const siteTitle = 'AI-code-Editor'
// 菜单配置项
const originItems: SimpleMenuItem[] = [
  {
    key: '/',
    label: '主页',
    title: '主页',
  },
  {
    key: '/admin/userManage',
    label: '用户管理',
    title: '用户管理',
  },
  {
    key: '/admin/appManage',
    label: '应用管理',
    title: '应用管理',
  },
]

// 过滤菜单项
const filterMenus = (menus: SimpleMenuItem[] = []) => {
  return menus.filter((menu) => {
    const menuKey = menu.key
    if (menuKey?.startsWith('/admin')) {
      const loginUser = loginUserStore.loginUser
      if (!loginUser || loginUser.userRole !== 'admin') {
        return false
      }
    }
    return true
  })
}

// 展示在菜单的路由数组
const menuItems = computed<SimpleMenuItem[]>(() => filterMenus(originItems))

// 用户注销
const doLogout = async () => {
  const res = await userLogout()
  if (res.data.code === 0) {
    loginUserStore.setLoginUser({
      userName: '未登录',
    })
    message.success('退出登录成功')
    await router.push('/user/login')
  } else {
    message.error('退出登录失败' + res.data.message)
  }
}

const selectedKeys = computed<string[]>(() => {
  const items = menuItems.value
  const match = items.find((i) => i.key === route.path)
  return match ? [match.key] : []
})

const flatMenuItems = computed<MenuProps['items']>(() =>
  menuItems.value.map((i) => ({ key: i.key, label: i.label })),
)

function onMenuClick(info: { key: string }) {
  router.push(info.key)
}
</script>

<template>
  <div class="gh">
    <div class="gh-left">
      <div class="gh-title">{{ siteTitle }}</div>
      <a-menu
        class="gh-menu"
        mode="horizontal"
        :selectedKeys="selectedKeys"
        :items="flatMenuItems"
        :disabledOverflow="true"
        @click="onMenuClick"
      />
    </div>

    <div class="gh-right">
      <div v-if="loginUserStore.loginUser.id">
        <a-dropdown>
          <a-space>
            <a-avatar :src="loginUserStore.loginUser.userAvatar" />
            {{ loginUserStore.loginUser.userName && 'default' }}
          </a-space>
          <template #overlay>
            <a-menu>
              <a-menu-item @click="doLogout">
                <LogoutOutlined />
                退出登录
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
      <div v-else>
        <a-button type="primary" href="/user/login">登录</a-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gh {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-radius: 16px;
  background: rgba(24, 9, 37, 0.72);
  border: 1px solid rgba(177, 140, 255, 0.12);
  backdrop-filter: blur(var(--blur-strength));
  box-shadow: var(--shadow-card);
  color: var(--text-primary);
}

.gh-left {
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
}

.gh-title {
  font-weight: 600;
  font-size: 18px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--accent-strong);
}

.gh-menu {
  background: transparent;
  color: var(--text-secondary);
}

:deep(.gh-menu .ant-menu-item) {
  color: var(--text-secondary);
  transition:
    color 0.2s ease,
    background 0.2s ease;
}

:deep(.gh-menu .ant-menu-item-selected) {
  color: var(--accent-strong) !important;
  background: rgba(177, 140, 255, 0.12) !important;
  border-radius: 12px !important;
}

:deep(.gh-menu .ant-menu-item::after) {
  display: none;
}

:deep(.ant-menu) {
  border-bottom: none;
  background: transparent;
}

.gh-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

:deep(.ant-avatar) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
}

@media (max-width: 768px) {
  :deep(.ant-menu) {
    display: none;
  }

  .gh {
    height: auto;
    padding: 12px 16px;
  }
}
</style>
