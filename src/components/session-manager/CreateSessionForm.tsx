import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CreateSessionInput, useClientSessions } from '@/hooks/useClientSessions';

const sessionFormSchema = z.object({
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères'),
  client_name: z.string().optional(),
  client_email: z.string().email('Email invalide').optional().or(z.literal('')),
  client_phone: z.string().optional(),
  client_company: z.string().optional(),
  client_address: z.string().optional(),
  event_date: z.string().optional(),
  event_location: z.string().optional(),
  event_description: z.string().optional(),
  max_teams: z.number().min(1).max(100).default(20),
  session_type: z.enum(['quiz', 'blindtest', 'mixed']).default('quiz'),
  branding_primary_color: z.string().default('#3b82f6'),
  branding_secondary_color: z.string().default('#8b5cf6'),
  custom_instructions: z.string().optional(),
  notes: z.string().optional(),
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

interface CreateSessionFormProps {
  onSuccess?: (sessionId: string) => void;
  onCancel?: () => void;
}

export function CreateSessionForm({ onSuccess, onCancel }: CreateSessionFormProps) {
  const { createSession } = useClientSessions();

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      name: '',
      max_teams: 20,
      session_type: 'quiz',
      branding_primary_color: '#3b82f6',
      branding_secondary_color: '#8b5cf6',
    },
  });

  const onSubmit = async (values: SessionFormValues) => {
    const input: CreateSessionInput = {
      ...values,
      client_email: values.client_email || undefined,
    };

    createSession.mutate(input, {
      onSuccess: (data) => {
        form.reset();
        if (onSuccess) onSuccess(data.id);
      },
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Session Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Informations de la Session</h3>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom de la Session *</FormLabel>
                <FormControl>
                  <Input placeholder="Soirée Quiz TotalEnergies" {...field} />
                </FormControl>
                <FormDescription>
                  Nom qui apparaîtra sur l'écran et dans les communications
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="session_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de Session</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="blindtest">Blindtest</SelectItem>
                      <SelectItem value="mixed">Quiz + Blindtest</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_teams"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Max d'Équipes</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Limite de joueurs pour cet événement</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="event_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date de l'Événement</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(new Date(field.value), 'PPP à HH:mm', { locale: fr })
                        ) : (
                          <span>Sélectionner une date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          // Set time to 20:00 by default
                          date.setHours(20, 0, 0, 0);
                          field.onChange(date.toISOString());
                        }
                      }}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="event_location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lieu de l'Événement</FormLabel>
                <FormControl>
                  <Input placeholder="Salle des fêtes, Paris 15e" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="event_description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Description de l'événement..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Client Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Informations Client</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="client_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du Contact</FormLabel>
                  <FormControl>
                    <Input placeholder="Jean Dupont" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="client_company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entreprise</FormLabel>
                  <FormControl>
                    <Input placeholder="TotalEnergies" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="client_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contact@client.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="client_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone</FormLabel>
                  <FormControl>
                    <Input placeholder="06 12 34 56 78" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="client_address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Adresse de Facturation</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="123 Rue de la Paix, 75001 Paris"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Branding */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Personnalisation</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="branding_primary_color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Couleur Principale</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input type="color" {...field} className="w-20 h-10" />
                      <Input {...field} placeholder="#3b82f6" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="branding_secondary_color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Couleur Secondaire</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input type="color" {...field} className="w-20 h-10" />
                      <Input {...field} placeholder="#8b5cf6" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="custom_instructions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instructions Personnalisées</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Instructions spécifiques pour les joueurs..."
                    className="resize-none min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Ces instructions apparaîtront dans le kit client et sur la page de connexion
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes Internes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Notes privées (non visibles par le client)..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-4 justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
          )}
          <Button type="submit" disabled={createSession.isPending}>
            {createSession.isPending ? 'Création...' : 'Créer la Session'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
