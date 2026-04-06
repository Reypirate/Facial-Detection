import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                cream: {
                    50: '#FEFDFB',
                    100: '#FDF8F0',
                    200: '#F9EDDB',
                },
                warm: {
                    300: '#E8DDD3',
                    400: '#C9BDB0',
                    500: '#A89888',
                },
                soft: {
                    rose: '#E8B4B8',
                    sage: '#B5C4B1',
                    sky: '#A8C4D9',
                    lavender: '#C4B5D4',
                    peach: '#E8C4A8',
                },
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
            },
        },
    },
    plugins: [],
};
export default config;
