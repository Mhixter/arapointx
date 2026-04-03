import { MapPin, Clock, ArrowRight, Briefcase, Code2, HeartHandshake, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const openings = [
  {
    title: "Senior Backend Engineer",
    department: "Engineering",
    location: "Lagos / Remote",
    type: "Full-time",
    desc: "Build and scale the APIs and services that power identity verification for thousands of businesses across Nigeria.",
    tags: ["Node.js", "PostgreSQL", "AWS"],
  },
  {
    title: "Frontend Engineer",
    department: "Engineering",
    location: "Lagos / Remote",
    type: "Full-time",
    desc: "Shape the user experience of our developer portal and customer dashboard using React and modern tooling.",
    tags: ["React", "TypeScript", "Tailwind CSS"],
  },
  {
    title: "DevOps / Infrastructure Engineer",
    department: "Engineering",
    location: "Remote",
    type: "Full-time",
    desc: "Own our cloud infrastructure, CI/CD pipelines, and ensure 99.9% uptime for Nigeria's identity verification layer.",
    tags: ["Docker", "Kubernetes", "Terraform"],
  },
  {
    title: "Business Development Manager",
    department: "Growth",
    location: "Lagos",
    type: "Full-time",
    desc: "Drive partnerships with fintech, HR, and education companies who need to integrate identity verification at scale.",
    tags: ["B2B Sales", "Fintech", "Partnerships"],
  },
  {
    title: "Customer Success Specialist",
    department: "Support",
    location: "Lagos / Remote",
    type: "Full-time",
    desc: "Be the trusted partner for our business clients — helping them integrate, troubleshoot, and get the most from Arapoint.",
    tags: ["Customer Success", "Technical Support"],
  },
];

const perks = [
  { icon: TrendingUp, title: "Competitive Compensation", desc: "Market-rate salary plus equity options so you share in our growth." },
  { icon: Clock, title: "Flexible Hours", desc: "We care about output, not clocking in. Work when you're at your best." },
  { icon: HeartHandshake, title: "Health & Wellbeing", desc: "Private health insurance, mental health support, and wellness allowance." },
  { icon: Code2, title: "Learning Budget", desc: "Annual budget for courses, conferences, and books to help you grow." },
  { icon: MapPin, title: "Remote-Friendly", desc: "Most roles can be done from anywhere in Nigeria. We have office space in Lagos too." },
  { icon: Briefcase, title: "Meaningful Work", desc: "Your work directly impacts how Nigerian businesses verify identities and prevent fraud." },
];

export default function Careers() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-muted/30 border-b border-border/50 py-20 px-4">
        <div className="container max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-primary/10 text-primary border-primary/20">
            <Briefcase className="w-3 h-3 mr-1.5" /> We're Hiring
          </div>
          <h1 className="text-4xl sm:text-5xl font-heading font-extrabold tracking-tight text-foreground">
            Build Nigeria's Identity Future With Us
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            At Arapoint, every team member plays a direct role in shaping how Nigeria verifies identity at scale. We're a small, ambitious team — and we're growing.
          </p>
        </div>
      </section>

      {/* Perks */}
      <section className="py-20 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Why Arapoint?</h2>
            <p className="text-muted-foreground">We believe the best teams are built by taking care of the people in them.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {perks.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-muted/30 border border-border/50 rounded-xl p-6 hover:border-primary/30 transition-all">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Openings */}
      <section className="bg-muted/30 border-y border-border/50 py-20 px-4">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl font-heading font-bold">Open Positions</h2>
            <p className="text-muted-foreground">Don't see the perfect role? Send your CV to <a href="mailto:careers@arapoint.com.ng" className="text-primary hover:underline">careers@arapoint.com.ng</a> and we'll be in touch.</p>
          </div>
          <div className="space-y-4">
            {openings.map(job => (
              <div key={job.title} className="bg-background border border-border/50 rounded-xl p-6 hover:border-primary/30 hover:shadow-sm transition-all group">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground text-base">{job.title}</h3>
                      <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/5">{job.department}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{job.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {job.tags.map(tag => (
                        <span key={tag} className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">{tag}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{job.type}</span>
                    </div>
                  </div>
                  <a href={`mailto:careers@arapoint.com.ng?subject=Application: ${job.title}`}>
                    <Button variant="outline" size="sm" className="shrink-0 gap-1 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                      Apply <ArrowRight className="w-3 h-3" />
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-2xl font-heading font-bold">Don't see your role?</h2>
          <p className="text-muted-foreground">We're always open to hearing from talented people. Send us your CV and a note about what you'd like to work on.</p>
          <a href="mailto:careers@arapoint.com.ng">
            <Button size="lg" className="h-12 px-8">Get in Touch</Button>
          </a>
        </div>
      </section>
    </div>
  );
}
