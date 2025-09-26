<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { register as userRegister } from '@/api/userController.ts'
import { message } from 'ant-design-vue'

const formState = reactive<API.UserRegisterRequest>({
  userAccount: '',
  userPassword: '',
  checkPassword: '',
})

const router = useRouter()

const validateConfirmPassword = (_rule: any, value: string) => {
  if (!value) {
    return Promise.reject('请再次输入密码')
  }
  if (value !== formState.userPassword) {
    return Promise.reject('两次输入的密码不一致')
  }
  return Promise.resolve()
}

const handleSubmit = async (values: any) => {
  const res = await userRegister(values)
  if (res.data.code === 0 && res.data.data) {
    message.success('注册成功，请登录')
    router.push({
      path: '/user/login',
      replace: true,
    })
  } else {
    message.error('注册失败' + res.data.message)
  }
}

const onFinishFailed = (errorInfo: any) => {
  console.log('Failed:', errorInfo)
}
</script>

<template>
  <div id="userRegisterPage" class="glass-surface">
    <h2 class="title">Bo-ai-code-Editor</h2>
    <div class="desc">一句话生成完整应用</div>
    <a-form
      :model="formState"
      name="basic"
      autocomplete="off"
      class="register-form"
      @finish="handleSubmit"
      @finishFailed="onFinishFailed"
    >
      <a-form-item name="userAccount" :rules="[{ required: true, message: '请输入您的账号!' }]">
        <a-input v-model:value="formState.userAccount" placeholder="请输入账号" />
      </a-form-item>

      <a-form-item
        name="userPassword"
        :rules="[
          { required: true, message: '请输入您的密码!' },
          { min: 6, message: '密码不能小于 6 位' },
        ]"
      >
        <a-input-password v-model:value="formState.userPassword" placeholder="请输入密码" />
      </a-form-item>

      <a-form-item name="checkPassword" :rules="[{ validator: validateConfirmPassword }]">
        <a-input-password v-model:value="formState.checkPassword" placeholder="请再次输入密码" />
      </a-form-item>

      <div class="tips">
        已有账号？
        <RouterLink to="/user/login">去登录</RouterLink>
      </div>

      <a-form-item>
        <a-button type="primary" html-type="submit" style="width: 100%">注册</a-button>
      </a-form-item>
    </a-form>
  </div>
</template>

<style scoped>
#userRegisterPage {
  max-width: 360px;
  margin: 0 auto;
  padding: 32px 28px;
  border-radius: 24px;
  border: 1px solid rgba(177, 140, 255, 0.18);
  backdrop-filter: blur(var(--blur-strength));
  box-shadow: var(--shadow-card);
}

.title {
  text-align: center;
  margin-bottom: 12px;
  color: var(--accent-strong);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.desc {
  text-align: center;
  margin-bottom: 16px;
  color: var(--text-tertiary);
  letter-spacing: 0.03em;
}

.tips {
  margin-bottom: 16px;
  color: var(--text-tertiary);
  font-size: 13px;
  text-align: right;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (max-width: 480px) {
  #userRegisterPage {
    padding: 24px 20px;
  }
}
</style>
