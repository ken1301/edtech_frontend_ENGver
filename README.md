This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🎨 New Features & UX Enhancements

This frontend includes premium UX/UI enhancements built with standard TailwindCSS & React components:

1. **EdTech Platform Dev Hub (`/`)**
   - The central navigation panel supporting developers in switching between the Student Dashboard, Teacher Dashboard, and Exercise Upload flow.
   
2. **Role-Based Login Redirection (`/login`)**
   - Integrates seamlessly with NestJS HttpOnly cookies and standardized authorization headers.
   - **Redirect Targets:**
     - `ADMIN`: Dev Hub (`/`)
     - `TEACHER`: `/teacher/dashboard`
     - `STUDENT`: `/student/dashboard`

3. **Dynamic Upload Stepper & SSE Stream (`/teacher/exercises/upload`)**
   - Connects with NestJS mock SSE stream. Shows real-time progress text based on status payload:
     - Step 1: `Đang tải lên...` -> `Đã tải lên thành công` (green check)
     - Step 2: `AI đang phân tích...` -> `AI đã phân tích xong`
     - Step 3: `Hoàn tất!`

4. **Auto-Expanding Question & Option Textareas**
   - Avoids truncation and internal scrollbars using custom AutoResize textareas on Question Review cards. Container height automatically expands to fit long question/option descriptions.

---

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
