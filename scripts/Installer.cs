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

            // Strip default Windows ButtonChrome
            FrameworkElementFactory factory = new FrameworkElementFactory(typeof(ContentPresenter));
            ControlTemplate template = new ControlTemplate(typeof(Button));
            template.VisualTree = factory;
            this.Template = template;

            _border = new Border
            {
                CornerRadius = new CornerRadius(10),
                Padding = new Thickness(22, 11, 22, 11)
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
                _border.Background = new SolidColorBrush(Color.FromRgb(22, 26, 42));
                _border.BorderBrush = new SolidColorBrush(Color.FromRgb(38, 44, 72));
                _border.BorderThickness = new Thickness(1);
                _textBlock.Foreground = new SolidColorBrush(Color.FromRgb(100, 116, 139));
                this.Cursor = Cursors.Arrow;
            }
            else
            {
                this.Cursor = Cursors.Hand;
                Color c1 = this.IsMouseOver ? Color.FromRgb(34, 211, 238) : Color.FromRgb(6, 182, 212);
                Color c2 = this.IsMouseOver ? Color.FromRgb(192, 132, 252) : Color.FromRgb(147, 51, 234);
                _border.Background = new LinearGradientBrush(c1, c2, 0.0);
                _border.BorderThickness = new Thickness(0);
                _textBlock.Foreground = new SolidColorBrush(Color.FromRgb(6, 8, 14));
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
            this.Width = 34;
            this.Height = 28;

            FrameworkElementFactory factory = new FrameworkElementFactory(typeof(ContentPresenter));
            ControlTemplate template = new ControlTemplate(typeof(Button));
            template.VisualTree = factory;
            this.Template = template;

            _border = new Border
            {
                CornerRadius = new CornerRadius(6),
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
                Width = 18,
                Height = 18,
                CornerRadius = new CornerRadius(5),
                BorderThickness = new Thickness(1),
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(0, 0, 9, 0)
            };

            _check = new TextBlock
            {
                Text = "\u2713",
                FontSize = 12,
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(Color.FromRgb(6, 8, 14)),
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };
            _box.Child = _check;

            TextBlock label = new TextBlock
            {
                Text = labelText,
                FontSize = 12,
                Foreground = new SolidColorBrush(Color.FromRgb(203, 213, 225)),
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
                _box.Background = new SolidColorBrush(Color.FromRgb(6, 182, 212));
                _box.BorderBrush = new SolidColorBrush(Color.FromRgb(34, 211, 238));
                _check.Visibility = Visibility.Visible;
            }
            else
            {
                _box.Background = new SolidColorBrush(Color.FromRgb(20, 24, 40));
                _box.BorderBrush = new SolidColorBrush(Color.FromRgb(45, 52, 80));
                _check.Visibility = Visibility.Collapsed;
            }
        }
    }

    public class ModernInstallerWindow : Window
    {
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
            this.Width = 660;
            this.Height = 440;
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
                Margin = new Thickness(12)
            };

            Border cardBorder = new Border
            {
                CornerRadius = new CornerRadius(14),
                BorderThickness = new Thickness(1),
                BorderBrush = new SolidColorBrush(Color.FromRgb(36, 42, 68)),
                Background = new LinearGradientBrush(
                    Color.FromRgb(12, 14, 24),
                    Color.FromRgb(8, 9, 16),
                    90.0
                ),
                Effect = new DropShadowEffect
                {
                    Color = Colors.Black,
                    BlurRadius = 24,
                    ShadowDepth = 6,
                    Opacity = 0.85
                },
                ClipToBounds = true
            };

            Grid mainGrid = new Grid();
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Accent line
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Title bar
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Hero header
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Feature cards
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Progress section
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Action deck

            // Top gradient accent line (3px)
            Border topAccent = new Border
            {
                Height = 3,
                Background = new LinearGradientBrush(
                    new GradientStopCollection
                    {
                        new GradientStop(Color.FromRgb(6, 182, 212), 0.0),
                        new GradientStop(Color.FromRgb(139, 92, 246), 0.5),
                        new GradientStop(Color.FromRgb(236, 72, 153), 1.0)
                    },
                    0.0
                )
            };
            Grid.SetRow(topAccent, 0);
            mainGrid.Children.Add(topAccent);

            // Row 1: Title Bar
            Grid titleBar = new Grid
            {
                Height = 42,
                Margin = new Thickness(18, 4, 14, 0),
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
                    Width = 20,
                    Height = 20,
                    Margin = new Thickness(0, 0, 9, 0),
                    VerticalAlignment = VerticalAlignment.Center
                };
                titleLeft.Children.Add(iconImg);
            }
            else
            {
                TextBlock bolt = new TextBlock
                {
                    Text = "\u26A1",
                    FontSize = 14,
                    Foreground = new SolidColorBrush(Color.FromRgb(6, 182, 212)),
                    Margin = new Thickness(0, 0, 8, 0),
                    VerticalAlignment = VerticalAlignment.Center
                };
                titleLeft.Children.Add(bolt);
            }

            TextBlock winTitle = new TextBlock
            {
                Text = "VictusClient Setup",
                FontSize = 13,
                FontWeight = FontWeights.SemiBold,
                Foreground = new SolidColorBrush(Color.FromRgb(226, 232, 240)),
                VerticalAlignment = VerticalAlignment.Center
            };
            titleLeft.Children.Add(winTitle);

            Border badge = new Border
            {
                Background = new SolidColorBrush(Color.FromRgb(16, 38, 62)),
                BorderBrush = new SolidColorBrush(Color.FromRgb(2, 132, 199)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(9),
                Padding = new Thickness(8, 2, 8, 2),
                Margin = new Thickness(12, 0, 0, 0),
                VerticalAlignment = VerticalAlignment.Center
            };
            badge.Child = new TextBlock
            {
                Text = "v1.0.5 \u2022 Official",
                FontSize = 10,
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(Color.FromRgb(56, 189, 248))
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

            // Row 2: Hero Header with 3D Ribbon Logo Emblem
            StackPanel heroPanel = new StackPanel
            {
                Margin = new Thickness(24, 6, 24, 14)
            };

            StackPanel heroRow = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                VerticalAlignment = VerticalAlignment.Center
            };

            if (appLogoBmp != null)
            {
                Border logoContainer = new Border
                {
                    Width = 52,
                    Height = 52,
                    CornerRadius = new CornerRadius(12),
                    Background = new SolidColorBrush(Color.FromArgb(180, 16, 19, 36)),
                    BorderBrush = new SolidColorBrush(Color.FromRgb(45, 54, 88)),
                    BorderThickness = new Thickness(1),
                    Margin = new Thickness(0, 0, 14, 0),
                    Padding = new Thickness(6),
                    Effect = new DropShadowEffect
                    {
                        Color = Color.FromRgb(147, 51, 234),
                        BlurRadius = 18,
                        ShadowDepth = 0,
                        Opacity = 0.55
                    }
                };

                Image heroLogo = new Image
                {
                    Source = appLogoBmp,
                    Stretch = Stretch.Uniform
                };
                logoContainer.Child = heroLogo;
                heroRow.Children.Add(logoContainer);
            }

            StackPanel heroTextStack = new StackPanel
            {
                VerticalAlignment = VerticalAlignment.Center
            };

            TextBlock heroTitle = new TextBlock
            {
                Text = "VICTUS CLIENT",
                FontSize = 24,
                FontWeight = FontWeights.ExtraBold,
                Foreground = Brushes.White
            };
            heroTextStack.Children.Add(heroTitle);

            TextBlock heroSubtitle = new TextBlock
            {
                Text = "Next-Generation Minecraft Launcher \u2022 High-FPS Engine & Cloud Multiplayer",
                FontSize = 11.5,
                Foreground = new SolidColorBrush(Color.FromRgb(167, 139, 250)),
                Margin = new Thickness(0, 3, 0, 0)
            };
            heroTextStack.Children.Add(heroSubtitle);

            heroRow.Children.Add(heroTextStack);
            heroPanel.Children.Add(heroRow);

            Grid.SetRow(heroPanel, 2);
            mainGrid.Children.Add(heroPanel);

            // Row 3: Feature Highlights (3 Cards)
            Grid cardsGrid = new Grid
            {
                Margin = new Thickness(24, 0, 24, 18)
            };
            cardsGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            cardsGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(14, GridUnitType.Pixel) });
            cardsGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            cardsGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(14, GridUnitType.Pixel) });
            cardsGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            Border card1 = CreateFeatureCard("\u26A1", Color.FromRgb(34, 211, 238), "Ultra FPS Engine", "Zero-lag Fabric & Forge with intelligent auto-tuning JVM memory allocation");
            Grid.SetColumn(card1, 0);
            cardsGrid.Children.Add(card1);

            Border card2 = CreateFeatureCard("\u2601", Color.FromRgb(192, 132, 252), "Free Cloud Servers", "Instant 24/7 world multiplayer with 1-click cloud wake & direct connect");
            Grid.SetColumn(card2, 2);
            cardsGrid.Children.Add(card2);

            Border card3 = CreateFeatureCard("\u2728", Color.FromRgb(244, 63, 94), "Shaders & Mods", "Integrated Modrinth browser for instant 1-click shaders, mods & resource packs");
            Grid.SetColumn(card3, 4);
            cardsGrid.Children.Add(card3);

            Grid.SetRow(cardsGrid, 3);
            mainGrid.Children.Add(cardsGrid);

            // Row 4: Progress Section
            StackPanel progressPanel = new StackPanel
            {
                Margin = new Thickness(24, 0, 24, 18)
            };

            Grid progressInfo = new Grid
            {
                Margin = new Thickness(0, 0, 0, 7)
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
                Height = 10,
                CornerRadius = new CornerRadius(5),
                Background = new SolidColorBrush(Color.FromRgb(18, 22, 38)),
                BorderBrush = new SolidColorBrush(Color.FromRgb(36, 42, 70)),
                BorderThickness = new Thickness(1),
                ClipToBounds = true
            };

            progressFill = new Border
            {
                Height = 10,
                CornerRadius = new CornerRadius(5),
                HorizontalAlignment = HorizontalAlignment.Left,
                Width = 0,
                Background = new LinearGradientBrush(
                    Color.FromRgb(6, 182, 212),
                    Color.FromRgb(168, 85, 247),
                    0.0
                )
            };
            progressTrack.Child = progressFill;

            progressTrack.SizeChanged += (s, e) =>
            {
                UpdateFillWidth(_currentPct);
            };

            progressPanel.Children.Add(progressTrack);

            Grid.SetRow(progressPanel, 4);
            mainGrid.Children.Add(progressPanel);

            // Row 5: Action Deck
            Grid actionDeck = new Grid
            {
                Margin = new Thickness(24, 4, 24, 20)
            };

            chkLaunch = new ModernCheckBox("Launch VictusClient after installation completes");
            chkLaunch.HorizontalAlignment = HorizontalAlignment.Left;
            actionDeck.Children.Add(chkLaunch);

            btnAction = new ModernButton
            {
                ButtonText = "Installing...",
                IsEnabled = false,
                HorizontalAlignment = HorizontalAlignment.Right,
                Width = 194,
                Height = 42
            };
            btnAction.Click += BtnAction_Click;
            actionDeck.Children.Add(btnAction);

            Grid.SetRow(actionDeck, 5);
            mainGrid.Children.Add(actionDeck);

            cardBorder.Child = mainGrid;
            rootGrid.Children.Add(cardBorder);
            this.Content = rootGrid;
        }

        private Border CreateFeatureCard(string icon, Color iconColor, string title, string desc)
        {
            Border card = new Border
            {
                Height = 92,
                Background = new SolidColorBrush(Color.FromRgb(16, 19, 34)),
                BorderBrush = new SolidColorBrush(Color.FromRgb(34, 40, 68)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(10),
                Padding = new Thickness(12, 10, 12, 10)
            };

            StackPanel sp = new StackPanel();

            StackPanel headerSp = new StackPanel { Orientation = Orientation.Horizontal };
            TextBlock iconTb = new TextBlock
            {
                Text = icon + " ",
                FontSize = 13,
                Foreground = new SolidColorBrush(iconColor),
                VerticalAlignment = VerticalAlignment.Center
            };
            TextBlock titleTb = new TextBlock
            {
                Text = title,
                FontSize = 12,
                FontWeight = FontWeights.Bold,
                Foreground = Brushes.White,
                VerticalAlignment = VerticalAlignment.Center
            };
            headerSp.Children.Add(iconTb);
            headerSp.Children.Add(titleTb);
            sp.Children.Add(headerSp);

            TextBlock descTb = new TextBlock
            {
                Text = desc,
                FontSize = 10,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                TextWrapping = TextWrapping.Wrap,
                Margin = new Thickness(0, 6, 0, 0),
                LineHeight = 14
            };
            sp.Children.Add(descTb);

            card.Child = sp;
            return card;
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
                Thread.Sleep(250);

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
                    string downloadUrl = "https://github.com/ArhanRaaj/VictusClient/releases/latest/download/VictusClient-Setup-1.0.5.exe";
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
                        entry.ExtractToFile(dest, true);
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
            if (trackW <= 0) trackW = 588;
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
                        key.SetValue("DisplayVersion", "1.0.5");
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
                    // Kill any background / orphaned VictusClient processes
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
        public static void Main()
        {
            Application app = new Application();
            ModernInstallerWindow win = new ModernInstallerWindow();
            app.Run(win);
        }
    }
}
