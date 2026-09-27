using System;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Diagnostics;
using System.Net;
using System.Threading;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Media.Effects;
using System.Windows.Input;
using System.Runtime.InteropServices;
using Microsoft.Win32;

namespace VictusClientInstaller
{
    public class ModernButton : Button
    {
        private Border _border;
        private TextBlock _textBlock;

        public string ButtonText
        {
            get { return _textBlock != null ? _textBlock.Text : ""; }
            set { if (_textBlock != null) _textBlock.Text = value; }
        }

        public ModernButton()
        {
            this.Cursor = Cursors.Hand;
            this.Background = Brushes.Transparent;
            this.BorderThickness = new Thickness(0);

            FrameworkElementFactory factory = new FrameworkElementFactory(typeof(ContentPresenter));
            ControlTemplate template = new ControlTemplate(typeof(Button));
            template.VisualTree = factory;
            this.Template = template;

            _border = new Border
            {
                CornerRadius = new CornerRadius(12),
                Padding = new Thickness(24, 0, 24, 0)
            };

            _textBlock = new TextBlock
            {
                FontSize = 13,
                FontWeight = FontWeights.Bold,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };

            _border.Child = _textBlock;
            this.Content = _border;

            this.MouseEnter += (s, e) => UpdateAppearance();
            this.MouseLeave += (s, e) => UpdateAppearance();
            this.IsEnabledChanged += (s, e) => UpdateAppearance();
            UpdateAppearance();
        }

        public void UpdateAppearance()
        {
            if (!this.IsEnabled)
            {
                _border.Background = new SolidColorBrush(Color.FromRgb(18, 22, 38));
                _border.BorderBrush = new SolidColorBrush(Color.FromRgb(34, 40, 68));
                _border.BorderThickness = new Thickness(1);
                _border.Effect = null;
                _textBlock.Foreground = new SolidColorBrush(Color.FromRgb(100, 116, 139));
                this.Cursor = Cursors.Arrow;
            }
            else
            {
                this.Cursor = Cursors.Hand;
                LinearGradientBrush grad = new LinearGradientBrush();
                grad.StartPoint = new Point(0, 0);
                grad.EndPoint = new Point(1, 1);

                if (this.IsMouseOver)
                {
                    grad.GradientStops.Add(new GradientStop(Color.FromRgb(147, 51, 234), 0.0));
                    grad.GradientStops.Add(new GradientStop(Color.FromRgb(99, 102, 241), 1.0));
                }
                else
                {
                    grad.GradientStops.Add(new GradientStop(Color.FromRgb(124, 58, 237), 0.0));
                    grad.GradientStops.Add(new GradientStop(Color.FromRgb(79, 70, 229), 1.0));
                }

                _border.Background = grad;
                _border.BorderBrush = new SolidColorBrush(Color.FromArgb(120, 192, 132, 252));
                _border.BorderThickness = new Thickness(1);
                _border.Effect = new DropShadowEffect
                {
                    Color = Color.FromRgb(124, 58, 237),
                    BlurRadius = this.IsMouseOver ? 20 : 12,
                    ShadowDepth = 0,
                    Opacity = this.IsMouseOver ? 0.75 : 0.45
                };
                _textBlock.Foreground = Brushes.White;
            }
        }
    }

    public class WindowControlButton : Button
    {
        private Border _border;
        private TextBlock _tb;
        private Color _hoverColor;

        public WindowControlButton(string symbol, Color hoverColor)
        {
            _hoverColor = hoverColor;
            this.Cursor = Cursors.Hand;
            this.Background = Brushes.Transparent;
            this.BorderThickness = new Thickness(0);
            this.Width = 30;
            this.Height = 30;

            FrameworkElementFactory factory = new FrameworkElementFactory(typeof(ContentPresenter));
            ControlTemplate template = new ControlTemplate(typeof(Button));
            template.VisualTree = factory;
            this.Template = template;

            _border = new Border
            {
                CornerRadius = new CornerRadius(15),
                Background = Brushes.Transparent
            };

            _tb = new TextBlock
            {
                Text = symbol,
                FontSize = 11,
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };

            _border.Child = _tb;
            this.Content = _border;

            this.MouseEnter += (s, e) =>
            {
                _border.Background = new SolidColorBrush(_hoverColor);
                _tb.Foreground = Brushes.White;
            };

            this.MouseLeave += (s, e) =>
            {
                _border.Background = Brushes.Transparent;
                _tb.Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184));
            };
        }
    }

    public class ModernCheckBox : StackPanel
    {
        private Border _box;
        private TextBlock _check;
        private bool _isChecked = true;

        public bool IsChecked
        {
            get { return _isChecked; }
            set { _isChecked = value; UpdateCheck(); }
        }

        public ModernCheckBox(string labelText)
        {
            this.Orientation = Orientation.Horizontal;
            this.Cursor = Cursors.Hand;
            this.VerticalAlignment = VerticalAlignment.Center;

            _box = new Border
            {
                Width = 20,
                Height = 20,
                CornerRadius = new CornerRadius(6),
                BorderThickness = new Thickness(1),
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(0, 0, 10, 0)
            };

            _check = new TextBlock
            {
                Text = "\u2713",
                FontSize = 13,
                FontWeight = FontWeights.ExtraBold,
                Foreground = Brushes.White,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };
            _box.Child = _check;

            TextBlock label = new TextBlock
            {
                Text = labelText,
                FontSize = 12.5,
                FontWeight = FontWeights.SemiBold,
                Foreground = new SolidColorBrush(Color.FromRgb(226, 232, 240)),
                VerticalAlignment = VerticalAlignment.Center
            };

            this.Children.Add(_box);
            this.Children.Add(label);

            this.MouseLeftButtonDown += (s, e) =>
            {
                IsChecked = !IsChecked;
            };

            UpdateCheck();
        }

        private void UpdateCheck()
        {
            if (_isChecked)
            {
                LinearGradientBrush grad = new LinearGradientBrush();
                grad.StartPoint = new Point(0, 0);
                grad.EndPoint = new Point(1, 1);
                grad.GradientStops.Add(new GradientStop(Color.FromRgb(124, 58, 237), 0.0));
                grad.GradientStops.Add(new GradientStop(Color.FromRgb(79, 70, 229), 1.0));

                _box.Background = grad;
                _box.BorderBrush = new SolidColorBrush(Color.FromRgb(168, 85, 247));
                _box.Effect = new DropShadowEffect
                {
                    Color = Color.FromRgb(147, 51, 234),
                    BlurRadius = 8,
                    ShadowDepth = 0,
                    Opacity = 0.5
                };
                _check.Visibility = Visibility.Visible;
            }
            else
            {
                _box.Background = new SolidColorBrush(Color.FromRgb(18, 22, 38));
                _box.BorderBrush = new SolidColorBrush(Color.FromRgb(45, 54, 88));
                _box.Effect = null;
                _check.Visibility = Visibility.Collapsed;
            }
        }
    }

    public class ModernInstallerWindow : Window
    {
        public const string APP_VERSION = "__APP_VERSION__";

        public TextBlock lblStatus;
        public TextBlock lblPercent;
        public Border progressTrack;
        public Border progressFill;
        public ModernCheckBox chkLaunch;
        public ModernButton btnAction;
        private string installDir;
        private int _currentPct = 0;
        private BitmapImage appLogoBmp = null;

        public ModernInstallerWindow()
        {
            this.Title = "VictusClient Setup";
            this.Width = 640;
            this.Height = 420;
            this.WindowStyle = WindowStyle.None;
            this.AllowsTransparency = true;
            this.Background = Brushes.Transparent;
            this.WindowStartupLocation = WindowStartupLocation.CenterScreen;

            installDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "VictusClient");

            LoadLogo();
            InitializeLayout();
            StartInstallation();
        }

        private void LoadLogo()
        {
            try
            {
                using (Stream iconStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("AppIcon"))
                {
                    if (iconStream != null)
                    {
                        appLogoBmp = new BitmapImage();
                        appLogoBmp.BeginInit();
                        appLogoBmp.StreamSource = iconStream;
                        appLogoBmp.CacheOption = BitmapCacheOption.OnLoad;
                        appLogoBmp.EndInit();
                        this.Icon = appLogoBmp;
                    }
                }
            }
            catch {}
        }

        private void InitializeLayout()
        {
            Grid rootGrid = new Grid
            {
                Margin = new Thickness(14)
            };

            // Outer Card Border with luxury glass styling
            Border cardBorder = new Border
            {
                CornerRadius = new CornerRadius(16),
                BorderThickness = new Thickness(1),
                BorderBrush = new SolidColorBrush(Color.FromArgb(45, 255, 255, 255)),
                Effect = new DropShadowEffect
                {
                    Color = Colors.Black,
                    BlurRadius = 32,
                    ShadowDepth = 8,
                    Opacity = 0.90
                },
                ClipToBounds = true
            };

            // Luxury radial glow canvas background
            RadialGradientBrush bgBrush = new RadialGradientBrush();
            bgBrush.Center = new Point(0.5, 0.20);
            bgBrush.GradientOrigin = new Point(0.5, 0.20);
            bgBrush.RadiusX = 0.75;
            bgBrush.RadiusY = 0.75;
            bgBrush.GradientStops.Add(new GradientStop(Color.FromRgb(26, 18, 48), 0.0));
            bgBrush.GradientStops.Add(new GradientStop(Color.FromRgb(14, 16, 28), 0.55));
            bgBrush.GradientStops.Add(new GradientStop(Color.FromRgb(9, 10, 18), 1.0));
            cardBorder.Background = bgBrush;

            Grid mainGrid = new Grid();
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // 0: Top radiant line
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // 1: Title bar
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // 2: Hero centerpiece
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // 3: Feature pill strip
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) }); // 4: Flexible spacer
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // 5: Progress section
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // 6: Action deck

            // Row 0: Top radiant gradient line (2.5px)
            Border topAccent = new Border
            {
                Height = 2.5
            };
            LinearGradientBrush accentGrad = new LinearGradientBrush();
            accentGrad.StartPoint = new Point(0, 0);
            accentGrad.EndPoint = new Point(1, 0);
            accentGrad.GradientStops.Add(new GradientStop(Color.FromRgb(124, 58, 237), 0.0));
            accentGrad.GradientStops.Add(new GradientStop(Color.FromRgb(6, 182, 212), 0.5));
            accentGrad.GradientStops.Add(new GradientStop(Color.FromRgb(99, 102, 241), 1.0));
            topAccent.Background = accentGrad;
            Grid.SetRow(topAccent, 0);
            mainGrid.Children.Add(topAccent);

            // Row 1: Title Bar
            Grid titleBar = new Grid
            {
                Height = 44,
                Margin = new Thickness(20, 2, 14, 0),
                Background = Brushes.Transparent
            };
            titleBar.MouseLeftButtonDown += (s, e) =>
            {
                if (e.ButtonState == MouseButtonState.Pressed) DragMove();
            };

            StackPanel titleLeft = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                VerticalAlignment = VerticalAlignment.Center
            };

            if (appLogoBmp != null)
            {
                Image iconImg = new Image
                {
                    Source = appLogoBmp,
                    Width = 19,
                    Height = 19,
                    Margin = new Thickness(0, 0, 9, 0),
                    VerticalAlignment = VerticalAlignment.Center
                };
                titleLeft.Children.Add(iconImg);
            }

            TextBlock winTitle = new TextBlock
            {
                Text = "VictusClient Setup",
                FontSize = 12.5,
                FontWeight = FontWeights.SemiBold,
                Foreground = new SolidColorBrush(Color.FromRgb(241, 245, 249)),
                VerticalAlignment = VerticalAlignment.Center
            };
            titleLeft.Children.Add(winTitle);

            // Dynamic Version Badge
            Border badge = new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(45, 124, 58, 237)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(120, 168, 85, 247)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(10),
                Padding = new Thickness(9, 2.5, 9, 2.5),
                Margin = new Thickness(12, 0, 0, 0),
                VerticalAlignment = VerticalAlignment.Center
            };
            string verText = APP_VERSION.Contains("beta") ? "v" + APP_VERSION + " \u2022 BETA" : "v" + APP_VERSION + " \u2022 NEXT-GEN";
            badge.Child = new TextBlock
            {
                Text = verText,
                FontSize = 10,
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(Color.FromRgb(216, 180, 254))
            };
            titleLeft.Children.Add(badge);

            titleBar.Children.Add(titleLeft);

            // Window Controls (Right)
            StackPanel controlsRight = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                HorizontalAlignment = HorizontalAlignment.Right,
                VerticalAlignment = VerticalAlignment.Center
            };

            WindowControlButton btnMin = new WindowControlButton("─", Color.FromRgb(30, 41, 59));
            btnMin.Click += (s, e) => this.WindowState = WindowState.Minimized;
            controlsRight.Children.Add(btnMin);

            WindowControlButton btnClose = new WindowControlButton("✕", Color.FromRgb(225, 29, 72));
            btnClose.Click += (s, e) => Application.Current.Shutdown();
            controlsRight.Children.Add(btnClose);

            titleBar.Children.Add(controlsRight);

            Grid.SetRow(titleBar, 1);
            mainGrid.Children.Add(titleBar);

            // Row 2: Hero Centerpiece (Clean & Luxurious)
            StackPanel heroPanel = new StackPanel
            {
                Margin = new Thickness(24, 10, 24, 0),
                HorizontalAlignment = HorizontalAlignment.Center
            };

            if (appLogoBmp != null)
            {
                Border logoContainer = new Border
                {
                    Width = 66,
                    Height = 66,
                    CornerRadius = new CornerRadius(18),
                    Background = new SolidColorBrush(Color.FromArgb(200, 20, 24, 45)),
                    BorderBrush = new SolidColorBrush(Color.FromArgb(160, 168, 85, 247)),
                    BorderThickness = new Thickness(1.5),
                    HorizontalAlignment = HorizontalAlignment.Center,
                    Padding = new Thickness(9),
                    Effect = new DropShadowEffect
                    {
                        Color = Color.FromRgb(147, 51, 234),
                        BlurRadius = 26,
                        ShadowDepth = 0,
                        Opacity = 0.65
                    }
                };

                Image heroLogo = new Image
                {
                    Source = appLogoBmp,
                    Stretch = Stretch.Uniform
                };
                logoContainer.Child = heroLogo;
                heroPanel.Children.Add(logoContainer);
            }

            TextBlock heroTitle = new TextBlock
            {
                Text = "VICTUS CLIENT",
                FontSize = 23,
                FontWeight = FontWeights.ExtraBold,
                Foreground = Brushes.White,
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(0, 12, 0, 0)
            };
            heroPanel.Children.Add(heroTitle);

            TextBlock heroSubtitle = new TextBlock
            {
                Text = "Next-Generation Minecraft Launcher \u2022 High-FPS Engine & Free Cloud Servers",
                FontSize = 11.5,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(0, 4, 0, 0)
            };
            heroPanel.Children.Add(heroSubtitle);

            Grid.SetRow(heroPanel, 2);
            mainGrid.Children.Add(heroPanel);

            // Row 3: Modern Feature Badges Strip (3 sleek capsules instead of heavy boxes)
            StackPanel badgeStrip = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(0, 16, 0, 10)
            };

            badgeStrip.Children.Add(CreateFeaturePill("\u26A1", Color.FromRgb(34, 211, 238), "Ultra FPS Engine"));
            badgeStrip.Children.Add(CreateFeaturePill("\u2601", Color.FromRgb(192, 132, 252), "Free 24/7 Cloud Servers"));
            badgeStrip.Children.Add(CreateFeaturePill("\u2728", Color.FromRgb(244, 63, 94), "Built-in Shaders & Mods"));

            Grid.SetRow(badgeStrip, 3);
            mainGrid.Children.Add(badgeStrip);

            // Row 5: Progress Section
            StackPanel progressPanel = new StackPanel
            {
                Margin = new Thickness(28, 0, 28, 16)
            };

            Grid progressInfo = new Grid
            {
                Margin = new Thickness(0, 0, 0, 8)
            };
            lblStatus = new TextBlock
            {
                Text = "Preparing installation...",
                FontSize = 11.5,
                Foreground = new SolidColorBrush(Color.FromRgb(203, 213, 225)),
                HorizontalAlignment = HorizontalAlignment.Left
            };
            progressInfo.Children.Add(lblStatus);

            lblPercent = new TextBlock
            {
                Text = "0%",
                FontSize = 12,
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(Color.FromRgb(56, 189, 248)),
                HorizontalAlignment = HorizontalAlignment.Right
            };
            progressInfo.Children.Add(lblPercent);

            progressPanel.Children.Add(progressInfo);

            progressTrack = new Border
            {
                Height = 8,
                CornerRadius = new CornerRadius(4),
                Background = new SolidColorBrush(Color.FromRgb(16, 20, 36)),
                BorderBrush = new SolidColorBrush(Color.FromRgb(34, 42, 70)),
                BorderThickness = new Thickness(1),
                ClipToBounds = true
            };

            progressFill = new Border
            {
                Height = 8,
                CornerRadius = new CornerRadius(4),
                HorizontalAlignment = HorizontalAlignment.Left,
                Width = 0
            };

            LinearGradientBrush fillGrad = new LinearGradientBrush();
            fillGrad.StartPoint = new Point(0, 0);
            fillGrad.EndPoint = new Point(1, 0);
            fillGrad.GradientStops.Add(new GradientStop(Color.FromRgb(139, 92, 246), 0.0));
            fillGrad.GradientStops.Add(new GradientStop(Color.FromRgb(6, 182, 212), 1.0));
            progressFill.Background = fillGrad;

            progressTrack.Child = progressFill;

            progressTrack.SizeChanged += (s, e) =>
            {
                UpdateFillWidth(_currentPct);
            };

            progressPanel.Children.Add(progressTrack);

            Grid.SetRow(progressPanel, 5);
            mainGrid.Children.Add(progressPanel);

            // Row 6: Action Deck (Footer)
            Grid actionDeck = new Grid
            {
                Margin = new Thickness(28, 0, 28, 22)
            };

            chkLaunch = new ModernCheckBox("Launch VictusClient after installation completes");
            chkLaunch.HorizontalAlignment = HorizontalAlignment.Left;
            actionDeck.Children.Add(chkLaunch);

            btnAction = new ModernButton
            {
                ButtonText = "Installing...",
                IsEnabled = false,
                HorizontalAlignment = HorizontalAlignment.Right,
                Width = 196,
                Height = 42
            };
            btnAction.Click += BtnAction_Click;
            actionDeck.Children.Add(btnAction);

            Grid.SetRow(actionDeck, 6);
            mainGrid.Children.Add(actionDeck);

            cardBorder.Child = mainGrid;
            rootGrid.Children.Add(cardBorder);
            this.Content = rootGrid;
        }

        private Border CreateFeaturePill(string icon, Color iconColor, string title)
        {
            Border pill = new Border
            {
                Height = 32,
                Background = new SolidColorBrush(Color.FromArgb(85, 18, 22, 38)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(90, 48, 56, 92)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(16),
                Padding = new Thickness(14, 0, 14, 0),
                Margin = new Thickness(5, 0, 5, 0),
                VerticalAlignment = VerticalAlignment.Center
            };

            StackPanel sp = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                VerticalAlignment = VerticalAlignment.Center
            };

            TextBlock iconTb = new TextBlock
            {
                Text = icon,
                FontSize = 13,
                Foreground = new SolidColorBrush(iconColor),
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(0, 0, 7, 0)
            };
            sp.Children.Add(iconTb);

            TextBlock titleTb = new TextBlock
            {
                Text = title,
                FontSize = 11.5,
                FontWeight = FontWeights.SemiBold,
                Foreground = new SolidColorBrush(Color.FromRgb(226, 232, 240)),
                VerticalAlignment = VerticalAlignment.Center
            };
            sp.Children.Add(titleTb);

            pill.Child = sp;
            return pill;
        }

        private void StartInstallation()
        {
            Thread t = new Thread(InstallWorker);
            t.IsBackground = true;
            t.Start();
        }

        private void InstallWorker()
        {
            try
            {
                UpdateProgress(5, "Verifying installation environment...");
                Thread.Sleep(200);

                // Terminate any running VictusClient instances to release file locks on app.asar
                UpdateProgress(10, "Closing running VictusClient instances...");
                try
                {
                    int currentId = Process.GetCurrentProcess().Id;
                    Process[] procs = Process.GetProcessesByName("VictusClient");
                    foreach (Process proc in procs)
                    {
                        if (proc.Id != currentId)
                        {
                            try
                            {
                                proc.Kill();
                                proc.WaitForExit(3000);
                            }
                            catch {}
                        }
                    }
                }
                catch {}
                Thread.Sleep(800);

                if (!Directory.Exists(installDir))
                {
                    Directory.CreateDirectory(installDir);
                }

                Assembly asm = Assembly.GetExecutingAssembly();
                string exePath = Path.Combine(installDir, "VictusClient.exe");

                bool hasEmbeddedPackage = false;

                using (Stream stream = asm.GetManifestResourceStream("AppPackage"))
                {
                    if (stream != null)
                    {
                        hasEmbeddedPackage = true;
                        UpdateProgress(20, "Extracting full client application...");
                        ExtractZipStream(stream, installDir, 20, 75);
                    }
                }

                if (!hasEmbeddedPackage)
                {
                    using (Stream asarStream = asm.GetManifestResourceStream("AppAsar"))
                    {
                        if (asarStream != null)
                        {
                            hasEmbeddedPackage = true;
                            UpdateProgress(25, "Deploying core client package (app.asar)...");
                            string resDir = Path.Combine(installDir, "resources");
                            if (!Directory.Exists(resDir)) Directory.CreateDirectory(resDir);
                            ExtractZipStream(asarStream, resDir, 25, 75);
                        }
                    }
                }

                // If runtime binary is missing on fresh machine, download latest release payload
                if (!File.Exists(exePath))
                {
                    UpdateProgress(25, "Fetching latest VictusClient runtime from GitHub...");
                    string downloadUrl = "https://github.com/ArhanRaaj/VictusClient/releases/latest/download/VictusClient-Setup.exe";
                    string tempExe = Path.Combine(Path.GetTempPath(), "VictusClient-Setup-Online.exe");

                    DownloadFileWithProgress(downloadUrl, tempExe, 25, 80);

                    UpdateProgress(82, "Configuring client binaries...");
                    Process p = Process.Start(new ProcessStartInfo(tempExe, "/S") { UseShellExecute = true });
                    if (p != null) p.WaitForExit(60000);
                    try { File.Delete(tempExe); } catch {}
                }

                UpdateProgress(88, "Creating Desktop & Start Menu shortcuts...");
                CreateShortcuts();

                UpdateProgress(96, "Registering Windows system entry...");
                RegisterUninstall();

                UpdateProgress(100, "Installation complete! Ready to launch.");
                this.Dispatcher.Invoke((Action)delegate
                {
                    lblStatus.Text = "VictusClient is installed and ready to play.";
                    lblStatus.Foreground = new SolidColorBrush(Color.FromRgb(52, 211, 153));
                    btnAction.ButtonText = "Finish & Launch \u2794";
                    btnAction.IsEnabled = true;
                });
            }
            catch (Exception ex)
            {
                this.Dispatcher.Invoke((Action)delegate
                {
                    lblStatus.Text = "Notice: " + ex.Message;
                    lblStatus.Foreground = new SolidColorBrush(Color.FromRgb(244, 63, 94));
                    btnAction.ButtonText = "Close";
                    btnAction.IsEnabled = true;
                    btnAction.Click -= BtnAction_Click;
                    btnAction.Click += (s, ev) => Application.Current.Shutdown();
                });
            }
        }

        private void ExtractZipStream(Stream stream, string targetDir, int startPct, int endPct)
        {
            using (ZipArchive archive = new ZipArchive(stream, ZipArchiveMode.Read))
            {
                int total = archive.Entries.Count;
                int current = 0;
                foreach (ZipArchiveEntry entry in archive.Entries)
                {
                    string dest = Path.Combine(targetDir, entry.FullName);
                    if (string.IsNullOrEmpty(entry.Name))
                    {
                        Directory.CreateDirectory(dest);
                    }
                    else
                    {
                        string dir = Path.GetDirectoryName(dest);
                        if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);

                        bool written = false;
                        for (int attempt = 0; attempt < 8; attempt++)
                        {
                            try
                            {
                                entry.ExtractToFile(dest, true);
                                written = true;
                                break;
                            }
                            catch (IOException)
                            {
                                try
                                {
                                    int currentId = Process.GetCurrentProcess().Id;
                                    foreach (Process p in Process.GetProcessesByName("VictusClient"))
                                    {
                                        if (p.Id != currentId)
                                        {
                                            p.Kill();
                                            p.WaitForExit(1000);
                                        }
                                    }
                                }
                                catch {}
                                Thread.Sleep(800);
                            }
                        }
                        if (!written)
                        {
                            entry.ExtractToFile(dest, true);
                        }
                    }
                    current++;
                    if (current % 5 == 0 || current == total)
                    {
                        int pct = startPct + (int)(((double)current / total) * (endPct - startPct));
                        UpdateProgress(pct, string.Format("Extracting: {0}", entry.Name));
                    }
                }
            }
        }

        private void DownloadFileWithProgress(string url, string destFile, int startPct, int endPct)
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
            using (WebClient client = new WebClient())
            {
                client.Headers.Add("User-Agent", "VictusClient-Installer");
                client.DownloadProgressChanged += (s, e) =>
                {
                    int pct = startPct + (int)(((double)e.ProgressPercentage / 100.0) * (endPct - startPct));
                    string mb = string.Format("{0:0.0} MB / {1:0.0} MB", e.BytesReceived / 1024.0 / 1024.0, e.TotalBytesToReceive / 1024.0 / 1024.0);
                    UpdateProgress(pct, string.Format("Downloading components: {0} ({1}%)", mb, e.ProgressPercentage));
                };

                AutoResetEvent done = new AutoResetEvent(false);
                client.DownloadFileCompleted += (s, e) => done.Set();
                client.DownloadFileAsync(new Uri(url), destFile);
                done.WaitOne();
            }
        }

        private void UpdateFillWidth(int value)
        {
            if (progressTrack == null || progressFill == null) return;
            double trackW = progressTrack.ActualWidth;
            if (trackW <= 0) trackW = 560;
            progressFill.Width = Math.Max(0, Math.Min(trackW, (value / 100.0) * trackW));
        }

        private void UpdateProgress(int value, string text)
        {
            _currentPct = value;
            if (!this.Dispatcher.CheckAccess())
            {
                this.Dispatcher.BeginInvoke((Action)delegate { UpdateProgress(value, text); });
                return;
            }
            UpdateFillWidth(value);
            lblPercent.Text = value + "%";
            lblStatus.Text = text;
        }

        private void CreateShortcuts()
        {
            try
            {
                string exePath = Path.Combine(installDir, "VictusClient.exe");
                if (!File.Exists(exePath)) return;

                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType != null)
                {
                    dynamic shell = Activator.CreateInstance(shellType);

                    // Desktop Shortcut
                    string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                    dynamic shortcut = shell.CreateShortcut(Path.Combine(desktop, "VictusClient.lnk"));
                    shortcut.TargetPath = exePath;
                    shortcut.WorkingDirectory = installDir;
                    shortcut.Description = "VictusClient - Next-Gen Minecraft Launcher";
                    shortcut.Save();

                    // Start Menu Shortcut
                    string startMenu = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
                    dynamic startShortcut = shell.CreateShortcut(Path.Combine(startMenu, "VictusClient.lnk"));
                    startShortcut.TargetPath = exePath;
                    startShortcut.WorkingDirectory = installDir;
                    startShortcut.Description = "VictusClient - Next-Gen Minecraft Launcher";
                    startShortcut.Save();
                }
            }
            catch {}
        }

        private void RegisterUninstall()
        {
            try
            {
                string keyPath = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\VictusClient";
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(keyPath))
                {
                    if (key != null)
                    {
                        string exePath = Path.Combine(installDir, "VictusClient.exe");
                        key.SetValue("DisplayName", "VictusClient");
                        key.SetValue("DisplayVersion", APP_VERSION);
                        key.SetValue("Publisher", "VictusClient Team");
                        key.SetValue("InstallLocation", installDir);
                        key.SetValue("DisplayIcon", exePath);
                        key.SetValue("UninstallString", "cmd.exe /c rd /s /q \"" + installDir + "\"");
                    }
                }
            }
            catch {}
        }

        private void BtnAction_Click(object sender, RoutedEventArgs e)
        {
            if (!btnAction.IsEnabled) return;

            if (chkLaunch.IsChecked)
            {
                try
                {
                    // Kill any lingering / background VictusClient processes
                    foreach (Process p in Process.GetProcessesByName("VictusClient"))
                    {
                        try
                        {
                            p.Kill();
                            p.WaitForExit(1000);
                        }
                        catch {}
                    }

                    string exePath = Path.Combine(installDir, "VictusClient.exe");
                    if (File.Exists(exePath))
                    {
                        ProcessStartInfo psi = new ProcessStartInfo(exePath)
                        {
                            WorkingDirectory = installDir,
                            UseShellExecute = true
                        };
                        Process.Start(psi);
                    }
                    else
                    {
                        string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                        string lnk = Path.Combine(desktop, "VictusClient.lnk");
                        if (File.Exists(lnk))
                        {
                            Process.Start(new ProcessStartInfo(lnk) { UseShellExecute = true });
                        }
                        else if (Directory.Exists(installDir))
                        {
                            Process.Start(new ProcessStartInfo(installDir) { UseShellExecute = true });
                        }
                    }
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Launch notice: " + ex.Message, "VictusClient", MessageBoxButton.OK, MessageBoxImage.Information);
                }
            }

            try
            {
                Application.Current.Shutdown();
            }
            catch
            {
                Environment.Exit(0);
            }
        }
    }

    public class Program
    {
        [STAThread]
        public static void Main(string[] args)
        {
            Application app = new Application();
            ModernInstallerWindow win = new ModernInstallerWindow();
            app.Run(win);
        }
    }
}
