const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Complaints and Suggestions...');

    // Get some users to associate feedback with
    const users = await prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        take: 5
    });

    const complaints = [
        {
            subject: 'تأخير في التوصيل',
            subjectEn: 'Delivery Delay',
            message: 'تأخر الطلب رقم #10234 لأكثر من يومين عن الموعد المحدد. يرجى التوضيح.',
            category: 'DELIVERY',
            priority: 'HIGH'
        },
        {
            subject: 'صعوبة في واجهة المستخدم',
            subjectEn: 'UI Difficulty',
            message: 'واجهة اختيار الخدمات محيرة بعض الشيء. واجهت صعوبة في تحديد نوع الزيت المناسب.',
            category: 'UI_UX',
            priority: 'MEDIUM'
        },
        {
            subject: 'ارتفاع في السعر',
            subjectEn: 'High Pricing',
            message: 'سعر خدمة تغيير الزيت مرتفع جداً مقارنة بالمنافسين في نفس المنطقة.',
            category: 'PAYMENT',
            priority: 'LOW'
        },
        {
            subject: 'منتج تالف جزئياً',
            subjectEn: 'Damaged Product',
            message: 'وصلني فلتر الزيت وعليه بعض الانبعاجات في الهيكل المعدني. أخشى أن يؤثر ذلك على الأداء.',
            category: 'PRODUCT',
            priority: 'URGENT'
        },
        {
            subject: 'تأخر الفني',
            subjectEn: 'Technician Delay',
            message: 'تأخر الفني عن الموعد المحدد بحوالي 45 دقيقة دون إبلاغي مسبقاً.',
            category: 'OTHER',
            priority: 'MEDIUM'
        }
    ];

    const suggestions = [
        {
            subject: 'إضافة الوضع الليلي',
            subjectEn: 'Add Dark Mode',
            message: 'سيكون من الرائع إضافة الوضع الليلي (Dark Mode) للتطبيق ولوحة التحكم لراحة العين.',
            category: 'UI_UX',
            priority: 'LOW'
        },
        {
            subject: 'دعم طرق دفع إضافية',
            subjectEn: 'More Payment Methods',
            message: 'يرجى إضافة خيارات دفع أكثر مثل Apple Pay و STC Pay لتسهيل العملية.',
            category: 'PAYMENT',
            priority: 'MEDIUM'
        },
        {
            subject: 'تتبع الفني لحظياً',
            subjectEn: 'Real-time Tracking',
            message: 'اقترح إضافة خاصية تتبع موقع الفني على الخريطة عندما يكون في طريقه للعميل.',
            category: 'UI_UX',
            priority: 'MEDIUM'
        },
        {
            subject: 'نظام نقاط الولاء',
            subjectEn: 'Loyalty Points System',
            message: 'نأمل إضافة نظام مكافآت أو نقاط ولاء للعملاء الدائمين لزيادة الارتباط بالتطبيق.',
            category: 'OTHER',
            priority: 'LOW'
        },
        {
            subject: 'تقارير فحص مفصلة',
            subjectEn: 'Detailed Inspection Reports',
            message: 'سيكون من المفيد جداً إرسال تقرير فحص شامل بصيغة PDF بعد كل عملية صيانة.',
            category: 'PRODUCT',
            priority: 'MEDIUM'
        }
    ];

    // Seed Complaints
    for (let i = 0; i < complaints.length; i++) {
        const c = complaints[i];
        const user = users[i % users.length];

        await prisma.feedback.create({
            data: {
                type: 'COMPLAINT',
                category: c.category,
                subject: c.subject,
                message: c.message,
                priority: c.priority,
                userId: user ? user.id : null,
                isAnonymous: !user
            }
        });
    }

    // Seed Suggestions
    for (let i = 0; i < suggestions.length; i++) {
        const s = suggestions[i];
        const user = users[i % users.length];

        await prisma.feedback.create({
            data: {
                type: 'SUGGESTION',
                category: s.category,
                subject: s.subject,
                message: s.message,
                priority: s.priority,
                userId: user ? user.id : null,
                isAnonymous: !user
            }
        });
    }

    console.log('✅ Successfully seeded 5 complaints and 5 suggestions.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
