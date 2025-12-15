import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Loader2, Award, Download, Printer } from "lucide-react";
import waecLogo from '@assets/kisspng-west-african-senior-school-certificate-examination-domestic-energy-performance-certificates-5b0dc33eecc3f6.4371727315276286069698-removebg-preview_1764215404355.png';
import nbaisLogo from '@assets/nbais-logo_1764215925986.png';
import jambLogo from '@assets/Official_JAMB_logo-removebg-preview_1764215962098.png';
import necoLogo from '@assets/neco-logo.df6f9256-removebg-preview_1764215976622.png';
import nabtebLogo from '@assets/images-removebg-preview_1764215992683.png';

const ExamLogo = ({ name, color, image }: { name: string, color?: string, image?: string }) => {
  if (image) {
    return <img src={image} alt={name} className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-30 lg:w-30 object-contain bg-transparent" />;
  }
  return (
    <div className={`h-12 w-12 rounded-lg flex items-center justify-center text-sm font-bold text-white ${color} shadow-sm`}>
      {name}
    </div>
  );
};

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River",
  "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano",
  "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun",
  "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

export default function EducationVerification() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedExam, setSelectedExam] = useState("jamb");

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    setTimeout(() => {
      setIsLoading(false);
      setResult({
        candidateName: "OGUNLEYE ADEOLA JOHN",
        examYear: "2023",
        examType: "UTME",
        regNumber: "202398765432AB",
        score: "285",
        subjects: [
          { name: "Use of English", score: "72" },
          { name: "Mathematics", score: "75" },
          { name: "Physics", score: "68" },
          { name: "Chemistry", score: "70" },
        ],
        status: "ADMITTED",
        institution: "UNIVERSITY OF LAGOS"
      });
    }, 2000);
  };

  const renderJAMBResultForm = () => (
    <form onSubmit={handleCheck} className="grid gap-3 md:gap-4 lg:gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div className="space-y-2">
          <Label htmlFor="jamb-reg">JAMB Registration Number *</Label>
          <Input id="jamb-reg" placeholder="e.g., 1234567890" required className="h-10 sm:h-11 uppercase text-sm" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="jamb-pin">Result PIN *</Label>
          <Input id="jamb-pin" placeholder="Enter PIN" required className="h-10 sm:h-11 text-sm" />
        </div>
      </div>

      <Button type="submit" size="lg" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Checking Result...
          </>
        ) : (
          "Check JAMB Result"
        )}
      </Button>
    </form>
  );

  const renderWAECForm = () => (
    <form onSubmit={handleCheck} className="grid gap-3 md:gap-4 lg:gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div className="space-y-2">
          <Label htmlFor="waec-exam-num">Examination Number *</Label>
          <Input id="waec-exam-num" placeholder="e.g., 1234567890" required className="h-10 sm:h-11 uppercase text-sm" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="waec-exam-year">Examination Year *</Label>
          <Select defaultValue={new Date().getFullYear().toString()}>
            <SelectTrigger className="h-10 sm:h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({length: 12}, (_, i) => new Date().getFullYear() + 1 - i).map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div className="space-y-2">
          <Label htmlFor="waec-exam-type">Candidate Type *</Label>
          <Select defaultValue="internal">
            <SelectTrigger className="h-10 sm:h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="internal">Internal Candidate</SelectItem>
              <SelectItem value="private">Private Candidate</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="waec-pin">PIN *</Label>
          <Input id="waec-pin" placeholder="Enter PIN" required className="h-10 sm:h-11 text-sm" />
        </div>
      </div>

      <div className="space-y-2 col-span-1 sm:col-span-2">
        <Label htmlFor="waec-serial">Serial Number *</Label>
        <Input id="waec-serial" placeholder="Enter Serial Number" required className="h-10 sm:h-11 text-sm" />
      </div>

      <Button type="submit" size="lg" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Checking Result...
          </>
        ) : (
          "Check WAEC Result"
        )}
      </Button>
    </form>
  );

  const renderNECOForm = () => (
    <form onSubmit={handleCheck} className="grid gap-3 md:gap-4 lg:gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div className="space-y-2 col-span-1 sm:col-span-2">
          <Label htmlFor="neco-reg">Registration Number *</Label>
          <Input id="neco-reg" placeholder="e.g., 1234567890" required className="h-10 sm:h-11 uppercase text-sm" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="neco-pin">PIN *</Label>
          <Input id="neco-pin" placeholder="Enter PIN" required className="h-10 sm:h-11 text-sm" />
        </div>
      </div>

      <Button type="submit" size="lg" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Checking Result...
          </>
        ) : (
          "Check NECO Result"
        )}
      </Button>
    </form>
  );

  const renderNABTEBForm = () => (
    <form onSubmit={handleCheck} className="grid gap-3 md:gap-4 lg:gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div className="space-y-2">
          <Label htmlFor="nabteb-cand">Candidate Number *</Label>
          <Input id="nabteb-cand" placeholder="e.g., 1234567890" required className="h-10 sm:h-11 uppercase text-sm" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nabteb-exam-type">Examination Type *</Label>
          <Select defaultValue="may">
            <SelectTrigger className="h-10 sm:h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="may">MAY/JUN</SelectItem>
              <SelectItem value="nov">NOV/DEC</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div className="space-y-2">
          <Label htmlFor="nabteb-year">Examination Year *</Label>
          <Select defaultValue={new Date().getFullYear().toString()}>
            <SelectTrigger className="h-10 sm:h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({length: 12}, (_, i) => new Date().getFullYear() + 1 - i).map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="nabteb-serial">Card Serial Number *</Label>
          <Input id="nabteb-serial" placeholder="Enter Serial Number" required className="h-10 sm:h-11 text-sm" />
        </div>
      </div>

      <div className="space-y-2 col-span-1 sm:col-span-2">
        <Label htmlFor="nabteb-pin">PIN *</Label>
        <Input id="nabteb-pin" placeholder="Enter PIN" required className="h-10 sm:h-11 text-sm" />
      </div>

      <Button type="submit" size="lg" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Checking Result...
          </>
        ) : (
          "Check NABTEB Result"
        )}
      </Button>
    </form>
  );

  const renderNBAISForm = () => (
    <form onSubmit={handleCheck} className="grid gap-3 md:gap-4 lg:gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div className="space-y-2">
          <Label htmlFor="nbais-state">State *</Label>
          <Select>
            <SelectTrigger className="h-10 sm:h-11">
              <SelectValue placeholder="Select State" />
            </SelectTrigger>
            <SelectContent>
              {NIGERIAN_STATES.map(state => (
                <SelectItem key={state} value={state}>{state}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="nbais-school">School Name *</Label>
          <Input id="nbais-school" placeholder="Enter School Name" required className="h-10 sm:h-11 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div className="space-y-2">
          <Label htmlFor="nbais-year">Exam Year *</Label>
          <Select defaultValue={new Date().getFullYear().toString()}>
            <SelectTrigger className="h-10 sm:h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({length: 12}, (_, i) => new Date().getFullYear() + 1 - i).map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="nbais-month">Exam Month *</Label>
          <Select defaultValue="06">
            <SelectTrigger className="h-10 sm:h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="01">January</SelectItem>
              <SelectItem value="02">February</SelectItem>
              <SelectItem value="03">March</SelectItem>
              <SelectItem value="04">April</SelectItem>
              <SelectItem value="05">May</SelectItem>
              <SelectItem value="06">June</SelectItem>
              <SelectItem value="07">July</SelectItem>
              <SelectItem value="08">August</SelectItem>
              <SelectItem value="09">September</SelectItem>
              <SelectItem value="10">October</SelectItem>
              <SelectItem value="11">November</SelectItem>
              <SelectItem value="12">December</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div className="space-y-2">
          <Label htmlFor="nbais-number">Exam Number *</Label>
          <Input id="nbais-number" placeholder="e.g., 1234567890" required className="h-10 sm:h-11 uppercase text-sm" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nbais-pin">PIN *</Label>
          <Input id="nbais-pin" placeholder="Enter PIN" required className="h-10 sm:h-11 text-sm" />
        </div>
      </div>

      <Button type="submit" size="lg" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Checking Result...
          </>
        ) : (
          "Check NBAIS Result"
        )}
      </Button>
    </form>
  );

  const renderJAMBServices = () => (
    <>
      {renderJAMBResultForm()}
    </>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold tracking-tight">JAMB Result Checker</h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">Check your JAMB UTME/DE examination results instantly.</p>
      </div>

      <div className="flex gap-2 sm:gap-3 md:gap-4 mb-4 flex-wrap justify-center sm:justify-start">
        <ExamLogo name="JAMB" image={jambLogo} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-4 md:space-y-6 lg:space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Check Your Result</CardTitle>
              <CardDescription>Enter your JAMB registration details to retrieve your result.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border-t pt-6">
                  {renderJAMBServices()}
                </div>
              </div>
            </CardContent>
          </Card>

          {result && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="border-2 border-primary/20 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <GraduationCap className="h-40 w-40" />
                </div>
                <CardHeader className="bg-muted/30 border-b text-center pb-6">
                  <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-700">
                    <Award className="h-8 w-8" />
                  </div>
                  <CardTitle className="text-2xl uppercase tracking-widest text-foreground">Result Slip</CardTitle>
                  <CardDescription className="font-mono text-xs uppercase tracking-widest">Official Verification Copy</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 md:space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Candidate Name</p>
                      <p className="font-bold text-base sm:text-lg">{result.candidateName}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Reg Number</p>
                      <p className="font-mono font-bold text-base sm:text-lg">{result.regNumber}</p>
                    </div>
                  </div>

                  <div className="border rounded-lg p-3 sm:p-4 bg-muted/10">
                    <div className="flex justify-between items-center mb-3 sm:mb-4 pb-2 border-b">
                      <span className="font-semibold text-sm sm:text-base">Subject</span>
                      <span className="font-semibold text-sm sm:text-base">Score</span>
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      {result.subjects.map((sub: any, i: number) => (
                        <div key={i} className="flex justify-between items-center text-xs sm:text-sm">
                          <span>{sub.name}</span>
                          <span className="font-mono font-bold">{sub.score}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t flex justify-between items-center">
                      <span className="font-bold text-base sm:text-lg">Aggregate Score</span>
                      <span className="font-mono font-bold text-xl sm:text-2xl text-primary">{result.score}</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 text-center">
                     <p className="text-sm text-blue-800 dark:text-blue-300">
                       Admission Status: <span className="font-bold">{result.status}</span>
                     </p>
                     <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{result.institution}</p>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/30 p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-4 justify-between">
                   <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                   <Button size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download Certificate
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}
        </div>

        <div className="space-y-4 md:space-y-6">
           <Card className="bg-gradient-to-br from-primary to-green-700 text-white border-none sticky top-4 sm:top-6 md:top-8 lg:top-0">
            <CardHeader>
              <CardTitle>Buy PINs</CardTitle>
              <CardDescription className="text-white/80">Purchase result checker PINs in bulk.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/20 pb-2">
                  <span>WAEC Scratch Card</span>
                  <span className="font-bold">₦3,500</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/20 pb-2">
                  <span>NECO Token</span>
                  <span className="font-bold">₦1,200</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/20 pb-2">
                  <span>JAMB Result Pin</span>
                  <span className="font-bold">₦1,500</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/dashboard/buy-pins" className="w-full">
                <Button variant="secondary" className="w-full text-primary font-bold">Purchase Now</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
