/*
  # Insert sample articles for testing

  1. Sample Data
    - Add a few sample articles to test the learning section
    - Include different categories and content types
*/

INSERT INTO articles (
  title,
  content,
  preview_text,
  image_url,
  category,
  tags,
  status,
  published_at
) VALUES 
(
  'Getting Started with Yoga: A Beginner''s Guide',
  '<h2>Welcome to Your Yoga Journey</h2><p>Starting a yoga practice can feel overwhelming, but it doesn''t have to be. This comprehensive guide will walk you through everything you need to know to begin your yoga journey with confidence.</p><h3>What is Yoga?</h3><p>Yoga is an ancient practice that combines physical postures, breathing techniques, and meditation to promote physical and mental well-being. The word "yoga" comes from the Sanskrit word "yuj," which means to unite or join.</p><h3>Benefits of Regular Practice</h3><ul><li>Improved flexibility and strength</li><li>Better posture and balance</li><li>Reduced stress and anxiety</li><li>Enhanced focus and concentration</li><li>Better sleep quality</li></ul><h3>Getting Started</h3><p>Begin with basic poses and focus on proper alignment. Remember, yoga is not about perfection—it''s about progress and self-awareness.</p>',
  'Everything you need to know to start your yoga journey, from basic poses to breathing techniques.',
  'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
  'beginner',
  ARRAY['beginner', 'basics', 'getting-started'],
  'published',
  now()
),
(
  'Yoga for Busy Professionals: Quick Desk Stretches',
  '<h2>Yoga at Your Desk</h2><p>Long hours at a desk can lead to tension, stiffness, and poor posture. These simple yoga stretches can be done right at your workspace to help you feel more energized and focused.</p><h3>Neck and Shoulder Release</h3><p>Gently roll your shoulders back and forth, then slowly turn your head from side to side. Hold each position for 15-30 seconds.</p><h3>Seated Spinal Twist</h3><p>Sit tall in your chair, place your right hand on the back of your chair, and gently twist to the right. Hold for 30 seconds, then repeat on the left side.</p><h3>Desk Downward Dog</h3><p>Place your hands on your desk, step back, and create an inverted V shape with your body. This helps stretch your back and shoulders.</p>',
  'Simple yoga stretches you can do at your desk to reduce tension and improve focus during busy workdays.',
  'https://images.pexels.com/photos/3823495/pexels-photo-3823495.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
  'corporate',
  ARRAY['corporate', 'desk-yoga', 'workplace-wellness'],
  'published',
  now()
),
(
  'The Science of Breathing: Pranayama Techniques',
  '<h2>The Power of Breath</h2><p>Pranayama, or breath control, is one of the most powerful tools in yoga. These techniques can help reduce stress, improve focus, and enhance overall well-being.</p><h3>Basic Breathing Techniques</h3><h4>1. Deep Belly Breathing</h4><p>Place one hand on your chest and one on your belly. Breathe slowly and deeply, ensuring your belly rises more than your chest.</p><h4>2. 4-7-8 Breathing</h4><p>Inhale for 4 counts, hold for 7 counts, and exhale for 8 counts. This technique is excellent for relaxation and sleep.</p><h4>3. Alternate Nostril Breathing</h4><p>Use your thumb to close your right nostril, inhale through the left. Then close the left nostril with your ring finger and exhale through the right.</p>',
  'Learn powerful breathing techniques that can transform your stress levels and enhance your yoga practice.',
  'https://images.pexels.com/photos/3823488/pexels-photo-3823488.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
  'wellness',
  ARRAY['breathing', 'pranayama', 'stress-relief'],
  'published',
  now()
);