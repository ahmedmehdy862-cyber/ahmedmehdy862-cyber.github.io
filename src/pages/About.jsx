import { motion } from 'framer-motion';

export default function About() {
  const skills = [
    {
      category: 'الواجهات الأمامية',
      items: ['React', 'Vue.js', 'TypeScript', 'Tailwind CSS', 'HTML/CSS'],
    },
    {
      category: 'الخوادم',
      items: ['Node.js', 'Express', 'Python', 'Django', 'REST APIs'],
    },
    {
      category: 'قواعد البيانات',
      items: ['MongoDB', 'PostgreSQL', 'MySQL', 'Redis'],
    },
    {
      category: 'الأدوات',
      items: ['Git', 'Docker', 'AWS', 'CI/CD', 'Linux'],
    },
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-6">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            عن <span className="gradient-text"> myself</span>
          </h1>
        </motion.div>

        {/* About Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="glass rounded-2xl p-8 mb-12"
        >
          <div className="prose prose-invert max-w-none">
            <p className="text-text-secondary text-lg leading-relaxed mb-6">
              مرحباً! أنا مطور شغوف ببناء تطبيقات ويب حديثة وسريعة. بدأت رحلتي
              في عالم البرمجة قبل عدة سنوات، ومنذ ذلك الحين وأنا أعمل على
              تطوير مشاريع متنوعة تخدم المستخدمين وتحل مشاكل حقيقية.
            </p>
            <p className="text-text-secondary text-lg leading-relaxed mb-6">
              أؤمن بأن الكود الجيد هو الكود القابل للقراءة والصيانة. أحب
              تعلم التقنيات الجديدة وتطبيق أفضل الممارسات في مشاريعي. هدفي هو
              تقديم حلول تقنية مبتكرة تحدث فرقاً حقيقياً.
            </p>
            <p className="text-text-secondary text-lg leading-relaxed">
              عندما لا أكون أمام الشاشة، أستمتع بالقراءة، التعلم، ومشاركة
              المعرفة مع المجتمع التقني.
            </p>
          </div>
        </motion.div>

        {/* Skills */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h2 className="text-3xl font-bold mb-8 text-center">
            المهارات <span className="gradient-text">التقنية</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {skills.map((skillGroup, index) => (
              <motion.div
                key={skillGroup.category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                className="glass rounded-xl p-6"
              >
                <h3 className="text-xl font-bold text-accent mb-4">
                  {skillGroup.category}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {skillGroup.items.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-dark border border-dark-border rounded-lg text-sm text-text-secondary hover:border-accent hover:text-accent transition-all duration-300"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Experience Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-16"
        >
          <h2 className="text-3xl font-bold mb-8 text-center">
            الخبرة <span className="gradient-text">العملية</span>
          </h2>

          <div className="space-y-8">
            {[
              {
                title: 'مطور ويب أول',
                company: 'شركة تقنية',
                period: '2023 - الحالي',
                description: 'قيادة فريق تطوير وبناء تطبيقات ويب متكاملة',
              },
              {
                title: 'مطور ويب',
                company: 'وكالة رقمية',
                period: '2021 - 2023',
                description: 'تطوير مواقع ويب تفاعلية للعملاء',
              },
              {
                title: 'مطور واجهات أمامية',
                company: 'شركة ناشئة',
                period: '2020 - 2021',
                description: 'بناء واجهات مستخدم حديثة وسريعة',
              },
            ].map((exp, index) => (
              <motion.div
                key={exp.title}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass rounded-xl p-6 relative"
              >
                <div className="absolute top-6 right-0 w-2 h-2 bg-accent rounded-full" />
                <div className="mr-6">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-text-primary">
                      {exp.title}
                    </h3>
                    <span className="text-accent text-sm">@ {exp.company}</span>
                  </div>
                  <p className="text-text-secondary text-sm mb-2">
                    {exp.period}
                  </p>
                  <p className="text-text-secondary">{exp.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
