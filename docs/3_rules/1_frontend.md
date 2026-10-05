# Regras: Frontend

## Estética e UI
- **Obrigatório o uso de Glassmorphism**: Painéis flutuantes, desfoque de fundo (backdrop-filter) e bordas finas semi-transparentes devem ser mantidos para preservar o visual "premium".
- **Sem Bibliotecas de Componentes Pesadas**: O uso de React, Vue, Material UI ou Bootstrap é terminantemente proibido para manter o tamanho final (bundle) extremamente reduzido. Tudo deve ser mantido em HTML/CSS/JS puros ou com o mínimo de plugins estritamente necessários (ex: Chart.js).
- **Modo Demonstração First**: O painel deve **sempre** conseguir rodar em "Modo Demonstração" de forma transparente se a conexão com o WebSocket falhar ou não for fornecida. A UI nunca deve ficar travada aguardando o backend.

## Responsividade
- A interface deve se adaptar fluídamente entre telas de Desktop, Tablets e dispositivos móveis (Mobile-first em CSS Grid/Flexbox).

## Feedback de Ações
- Qualquer ação destrutiva ou de alteração de estado (ex: Reiniciar ou Parar um container Docker) deve obrigatoriamente exigir confirmação do usuário (modais ou alerts).

## Segurança
- **Privacidade da Chave**: A interface do frontend **não deve** trafegar ou armazenar a Chave Privada SSH sem necessidade (ex: salvar no LocalStorage é proibido) para garantir a segurança das credenciais do usuário.

## Transição de Estado (Modo Híbrido)
- **Troca Suave**: Ao alterar o modo de "Local" para "SSH" (ou vice-versa), a UI deve resetar os gráficos de forma limpa e exibir um estado temporário de "Conectando..." sem travar a renderização.
