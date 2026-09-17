import Hero from '../components/Hero';
import GitHubStats from '../components/GitHubStats';
import ProjectCard from '../components/ProjectCard';
import { useGitHub } from '../hooks/useGitHub';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Home() {
  const { repos, stats, loading } = useGitHub();

  const featuredRepos = repos.slice(0, 3);

  return (
    <div>
      <Hero />
      <GitHubStats stats={stats} />

      {/* Featured Projects */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              أحدث <span className="gradient-text">المشاريع</span>
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              مشاريع حديثة عملت عليها باستخدام أحدث التقنيات
            </p>
          </motion.div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredRepos.map((repo, index) => (
                <ProjectCard key={repo.id} project={repo} index={index} />
              ))}
            </div>
          )}

          {!loading && featuredRepos.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mt-12"
            >
              <Link
                to="/projects"
                className="inline-flex items-center gap-2 text-accent hover:text-accent-light transition-colors font-medium"
              >
                عرض جميع المشاريع
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
            </motion.div>
          )}
        </div>
      </section>

      {/* Skills Section */}
      <section className="py-20 px-6 bg-dark-card">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              المهارات <span className="gradient-text">التقنية</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              'React',
              'TypeScript',
              'Node.js',
              'Python',
              'Git',
              'Docker',
              'AWS',
              'MongoDB',
            ].map((skill, index) => (
              <motion.div
                key={skill}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="glass rounded-xl p-4 text-center hover:border-accent transition-all duration-300"
              >
                <span className="text-text-primary font-medium">{skill}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
