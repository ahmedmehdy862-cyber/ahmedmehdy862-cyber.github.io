import { motion } from 'framer-motion';

export default function Hero() {
  return (
    <section className="min-h-screen flex items-center justify-center px-6 pt-20">
      <div className="container mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-accent font-mono text-sm mb-4">مرحباً، أنا</p>
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="gradient-text">المطور</span>
            <br />
            <span className="text-text-primary">المحترف</span>
          </h1>
          <p className="text-text-secondary text-lg md:text-xl max-w-2xl mx-auto mb-8">
            أبني تطبيقات ويب حديثة وسريعة باستخدام أحدث التقنيات.
            شغفي هو تحويل الأفكار إلى واقع رقمي مميز.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/projects"
              className="px-8 py-3 bg-accent hover:bg-accent-light text-white rounded-lg font-medium transition-all duration-300 hover:shadow-lg hover:shadow-accent/30"
            >
              مشاهدة المشاريع
            </a>
            <a
              href="/contact"
              className="px-8 py-3 border border-dark-border hover:border-accent text-text-primary rounded-lg font-medium transition-all duration-300"
            >
              تواصل معي
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="mt-20"
        >
          <div className="animate-bounce">
            <svg
              className="w-6 h-6 mx-auto text-text-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
