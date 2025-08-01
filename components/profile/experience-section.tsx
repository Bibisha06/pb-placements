"use client";

import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Experience {
  id: string;
  title: string;
  company: string;
  start_date: string;
  end_date: string | null;
  description: string;
}

interface ExperienceSectionProps {
  experiences: Experience[];
  isEditable?: boolean;
}

export function ExperienceSection({ experiences, isEditable }: ExperienceSectionProps) {
  if (!experiences || experiences.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-4">
      {experiences.map((experience) => {
        const startDate = new Date(experience.start_date);
        const endDate = experience.end_date ? new Date(experience.end_date) : null;
        
        const formattedStartDate = format(startDate, 'MMM yyyy');
        const formattedEndDate = endDate
          ? format(endDate, 'MMM yyyy')
          : 'Present';
        
        const dateRange = `${formattedStartDate} - ${formattedEndDate}`;
        
        return (
          <div key={experience.id} className="border-b border-gray-800 pb-4 last:border-0 last:pb-0">
            <h3 className="text-base font-semibold text-white">{experience.title}</h3>
            <p className="text-green-400 text-sm mt-1">{experience.company}</p>
            <p className="text-gray-400 text-xs mt-1">{dateRange}</p>
            {experience.description && (
              <ul className="list-disc list-inside text-gray-300 text-sm mt-2 space-y-1">
                {experience.description
                  .split(/[•·‣●◦⁃∙]\s*/g)  
                  .map((point: string, index: number) =>
                    point.trim() ? <li key={index}>{point.trim()}</li> : null
                  )}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}