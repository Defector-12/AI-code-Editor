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
        mode="horizontal"
        :selectedKeys="selectedKeys"
        :items="flatMenuItems"
        :disabledOverflow="true"
        :style="{ background: 'transparent', color: 'rgba(0, 0, 0, 0.88)' }"
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
  padding: 0 16px;
  gap: 12px;
}
.gh-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}
.gh-title {
  font-weight: 600;
  font-size: 16px;
  white-space: nowrap;
}
:deep(.ant-menu) {
  border-bottom: none;
}
@media (max-width: 768px) {
  :deep(.ant-menu) {
    display: none;
  }
}
.gh-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
