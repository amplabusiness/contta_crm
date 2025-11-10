# Templates de Email - Contta CRM

Este documento contém os templates de email personalizados para serem configurados no Supabase.

## 📧 Como Configurar no Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em: **Authentication** → **Email Templates**
4. Copie e cole os templates abaixo

---

## 🔑 Template: Recuperação de Senha (Password Recovery)

**Subject:** Redefinir Senha - Contta CRM

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redefinir Senha - Contta CRM</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); padding: 40px 30px; text-align: center;">
                            <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); width: 60px; height: 60px; border-radius: 50%; line-height: 60px; font-size: 30px; margin-bottom: 15px;">
                                🔒
                            </div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                                Contta CRM
                            </h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                                Recuperação de Senha
                            </p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #f1f5f9; font-size: 22px; font-weight: 600;">
                                Olá!
                            </h2>
                            
                            <p style="margin: 0 0 20px 0; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                                Recebemos uma solicitação para redefinir a senha da sua conta no <strong style="color: #f1f5f9;">Contta CRM</strong>.
                            </p>

                            <p style="margin: 0 0 30px 0; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                                Clique no botão abaixo para criar uma nova senha:
                            </p>

                            <!-- Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td align="center" style="padding: 0 0 30px 0;">
                                        <a href="{{ .ConfirmationURL }}" 
                                           style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3);">
                                            Redefinir Minha Senha
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Alternative Link -->
                            <div style="background-color: #0f172a; border-left: 4px solid #4f46e5; padding: 15px 20px; border-radius: 8px; margin-bottom: 30px;">
                                <p style="margin: 0 0 10px 0; color: #94a3b8; font-size: 13px;">
                                    Se o botão não funcionar, copie e cole este link no seu navegador:
                                </p>
                                <p style="margin: 0; color: #6366f1; font-size: 13px; word-break: break-all;">
                                    {{ .ConfirmationURL }}
                                </p>
                            </div>

                            <!-- Warning -->
                            <div style="background-color: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px;">
                                <p style="margin: 0; color: #fca5a5; font-size: 14px; line-height: 1.5;">
                                    ⚠️ <strong>Importante:</strong> Este link expira em <strong>1 hora</strong> por motivos de segurança.
                                </p>
                            </div>

                            <p style="margin: 0 0 15px 0; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                                Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanecerá inalterada.
                            </p>

                            <p style="margin: 0; color: #64748b; font-size: 13px; font-style: italic;">
                                Por segurança, nunca compartilhe este link com outras pessoas.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #0f172a; padding: 30px; text-align: center; border-top: 1px solid #334155;">
                            <p style="margin: 0 0 10px 0; color: #94a3b8; font-size: 14px;">
                                <strong>Contta CRM</strong> - Sistema de Gestão de Relacionamento com Clientes
                            </p>
                            <p style="margin: 0 0 15px 0; color: #64748b; font-size: 12px;">
                                Transformando dados em oportunidades de negócio
                            </p>
                            <div style="border-top: 1px solid #334155; padding-top: 15px; margin-top: 15px;">
                                <p style="margin: 0; color: #475569; font-size: 11px;">
                                    © {{ .Year }} Contta CRM. Todos os direitos reservados.<br>
                                    Este é um email automático, por favor não responda.
                                </p>
                            </div>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
```

---

## ✉️ Template: Confirmação de Email (Email Confirmation)

**Subject:** Confirme seu Email - Contta CRM

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirme seu Email - Contta CRM</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 30px; text-align: center;">
                            <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); width: 60px; height: 60px; border-radius: 50%; line-height: 60px; font-size: 30px; margin-bottom: 15px;">
                                ✦
                            </div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                                Bem-vindo ao Contta CRM!
                            </h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                                Confirme seu Email
                            </p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #f1f5f9; font-size: 22px; font-weight: 600;">
                                Estamos felizes em ter você conosco!
                            </h2>
                            
                            <p style="margin: 0 0 20px 0; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                                Obrigado por se cadastrar no <strong style="color: #f1f5f9;">Contta CRM</strong>, sua plataforma completa de gestão de relacionamento com clientes e prospecção inteligente.
                            </p>

                            <p style="margin: 0 0 30px 0; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                                Para começar a usar todas as funcionalidades, confirme seu endereço de email clicando no botão abaixo:
                            </p>

                            <!-- Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td align="center" style="padding: 0 0 30px 0;">
                                        <a href="{{ .ConfirmationURL }}" 
                                           style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.3);">
                                            Confirmar Meu Email
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Alternative Link -->
                            <div style="background-color: #0f172a; border-left: 4px solid #059669; padding: 15px 20px; border-radius: 8px; margin-bottom: 30px;">
                                <p style="margin: 0 0 10px 0; color: #94a3b8; font-size: 13px;">
                                    Se o botão não funcionar, copie e cole este link no seu navegador:
                                </p>
                                <p style="margin: 0; color: #10b981; font-size: 13px; word-break: break-all;">
                                    {{ .ConfirmationURL }}
                                </p>
                            </div>

                            <!-- Features -->
                            <div style="background-color: #0f172a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                                <p style="margin: 0 0 15px 0; color: #f1f5f9; font-size: 15px; font-weight: 600;">
                                    🚀 O que você pode fazer com o Contta CRM:
                                </p>
                                <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 14px; line-height: 1.8;">
                                    <li>Prospecção inteligente com integração CNPJá</li>
                                    <li>Análise de vínculos societários e rede empresarial</li>
                                    <li>Gestão completa de negócios e pipeline de vendas</li>
                                    <li>Assistente IA para análises e relatórios automáticos</li>
                                    <li>Dashboard com métricas em tempo real</li>
                                </ul>
                            </div>

                            <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                                Se você não criou esta conta, ignore este email.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #0f172a; padding: 30px; text-align: center; border-top: 1px solid #334155;">
                            <p style="margin: 0 0 10px 0; color: #94a3b8; font-size: 14px;">
                                <strong>Contta CRM</strong> - Sistema de Gestão de Relacionamento com Clientes
                            </p>
                            <p style="margin: 0 0 15px 0; color: #64748b; font-size: 12px;">
                                Transformando dados em oportunidades de negócio
                            </p>
                            <div style="border-top: 1px solid #334155; padding-top: 15px; margin-top: 15px;">
                                <p style="margin: 0; color: #475569; font-size: 11px;">
                                    © {{ .Year }} Contta CRM. Todos os direitos reservados.<br>
                                    Este é um email automático, por favor não responda.
                                </p>
                            </div>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
```

---

## 🔐 Template: Convite de Usuário (User Invite)

**Subject:** Você foi convidado para o Contta CRM

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Convite - Contta CRM</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
                            <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); width: 60px; height: 60px; border-radius: 50%; line-height: 60px; font-size: 30px; margin-bottom: 15px;">
                                👋
                            </div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                                Contta CRM
                            </h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                                Convite para Acessar
                            </p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #f1f5f9; font-size: 22px; font-weight: 600;">
                                Olá!
                            </h2>
                            
                            <p style="margin: 0 0 20px 0; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                                Você foi convidado para acessar o <strong style="color: #f1f5f9;">Contta CRM</strong>, nossa plataforma de gestão de relacionamento com clientes.
                            </p>

                            <p style="margin: 0 0 30px 0; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                                Clique no botão abaixo para aceitar o convite e criar sua senha:
                            </p>

                            <!-- Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td align="center" style="padding: 0 0 30px 0;">
                                        <a href="{{ .ConfirmationURL }}" 
                                           style="display: inline-block; background-color: #7c3aed; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.3);">
                                            Aceitar Convite
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Alternative Link -->
                            <div style="background-color: #0f172a; border-left: 4px solid #7c3aed; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px;">
                                <p style="margin: 0 0 10px 0; color: #94a3b8; font-size: 13px;">
                                    Se o botão não funcionar, copie e cole este link no seu navegador:
                                </p>
                                <p style="margin: 0; color: #8b5cf6; font-size: 13px; word-break: break-all;">
                                    {{ .ConfirmationURL }}
                                </p>
                            </div>

                            <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                                Se você não esperava este convite, pode ignorar este email com segurança.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #0f172a; padding: 30px; text-align: center; border-top: 1px solid #334155;">
                            <p style="margin: 0 0 10px 0; color: #94a3b8; font-size: 14px;">
                                <strong>Contta CRM</strong> - Sistema de Gestão de Relacionamento com Clientes
                            </p>
                            <p style="margin: 0 0 15px 0; color: #64748b; font-size: 12px;">
                                Transformando dados em oportunidades de negócio
                            </p>
                            <div style="border-top: 1px solid #334155; padding-top: 15px; margin-top: 15px;">
                                <p style="margin: 0; color: #475569; font-size: 11px;">
                                    © {{ .Year }} Contta CRM. Todos os direitos reservados.<br>
                                    Este é um email automático, por favor não responda.
                                </p>
                            </div>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
```

---

## ⚙️ Variáveis Disponíveis no Supabase

Os templates acima usam as seguintes variáveis que o Supabase substitui automaticamente:

- `{{ .ConfirmationURL }}` - Link de confirmação/recuperação
- `{{ .Token }}` - Token de confirmação (se precisar usar separadamente)
- `{{ .TokenHash }}` - Hash do token
- `{{ .SiteURL }}` - URL do site configurado no Supabase
- `{{ .Email }}` - Email do destinatário
- `{{ .Year }}` - Ano atual

---

## 📝 Instruções de Configuração

### Passo 1: Acessar Email Templates no Supabase

1. Login em https://supabase.com/dashboard
2. Selecione seu projeto: **ucgpeofveguxojlvozwr**
3. Menu lateral: **Authentication**
4. Aba: **Email Templates**

### Passo 2: Configurar cada Template

Para cada tipo de email (Confirm signup, Reset password, Invite user, etc.):

1. Clique no template desejado
2. Cole o código HTML correspondente acima
3. Ajuste o **Subject** (assunto)
4. Clique em **Save**

### Passo 3: Configurar URL de Redirecionamento

Em **Authentication** → **URL Configuration**:

- **Site URL:** `http://localhost:3000` (dev) ou `https://seudominio.com` (prod)
- **Redirect URLs:** Adicione:
  - `http://localhost:3000/**`
  - `https://seudominio.com/**`

---

## 🎨 Características dos Templates

✅ **Design Profissional**
- Dark theme consistente com o Contta CRM
- Gradientes modernos nos headers
- Layout responsivo para mobile

✅ **Acessibilidade**
- Link alternativo em texto para quem não vê o botão
- Alto contraste de cores
- Fontes legíveis

✅ **Segurança**
- Avisos de expiração de link
- Mensagens sobre não compartilhar links
- Orientação para ignorar emails não solicitados

✅ **Marca Consistente**
- Logo ✦ do Contta CRM
- Cores da identidade visual (#4f46e5, #059669, #7c3aed)
- Tagline: "Transformando dados em oportunidades de negócio"

---

## 🧪 Como Testar os Emails

### Teste no Ambiente Local:

1. Configure os templates no Supabase
2. No app, clique em "Esqueci minha senha"
3. Digite seu email
4. Verifique a caixa de entrada
5. O email deve chegar com o novo design!

### Teste de Renderização:

Você pode testar como o HTML renderiza em diferentes clientes de email usando:
- https://www.emailonacid.com/
- https://litmus.com/
- https://putsmail.com/ (envio de teste grátis)

---

## 📞 Suporte

Se precisar de ajuda para configurar os templates, consulte a documentação oficial do Supabase:
https://supabase.com/docs/guides/auth/auth-email-templates

---

**Última atualização:** Novembro 2025
**Versão:** 1.0
